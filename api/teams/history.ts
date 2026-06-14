import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { IPBL_API_BASE, RESULTS_LANG, isApprovedResultsTag, resultsKvKey } from "../../lib/server/results-sync-constants.js";
import {
  mergeTeamHistoryItems,
  officialOnlineTeamHistoryItems,
  parseStoredResultsMonth,
  teamHistoryItemsFromMonths,
} from "../../lib/server/team-history-from-results.js";

export const config = { maxDuration: 60 };


async function fetchOfficialOnlineHistoryRows(teamId: number, tag: string): Promise<{ items: ReturnType<typeof officialOnlineTeamHistoryItems>; ok: boolean; error: string | null }> {
  const url = `${IPBL_API_BASE}/calendar/online?tag=${encodeURIComponent(tag)}&lang=${encodeURIComponent(RESULTS_LANG)}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return { items: [], ok: false, error: `HTTP ${response.status}` };
    const raw = await response.json() as unknown;
    return { items: officialOnlineTeamHistoryItems(raw, teamId, tag), ok: true, error: null };
  } catch (error) {
    return { items: [], ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function recentCalendarWindows(days = 6): Array<{ from: string; to: string }> {
  const now = new Date();
  const windows: Array<{ from: string; to: string }> = [];
  for (let offset = days; offset >= 0; offset -= 1) {
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset + 1));
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - 1));
    windows.push({ from: isoDay(from), to: isoDay(to) });
  }
  return windows;
}

type OfficialRecentCalendarResult = {
  items: ReturnType<typeof officialOnlineTeamHistoryItems>;
  ok: boolean;
  error: string | null;
  windows: Array<{ from: string; to: string; ok: boolean; itemCount: number; error: string | null }>;
};

async function fetchOfficialRecentCalendarWindow(teamId: number, tag: string, window: { from: string; to: string }): Promise<{ items: ReturnType<typeof officialOnlineTeamHistoryItems>; ok: boolean; error: string | null; window: { from: string; to: string } }> {
  const params = new URLSearchParams({ tag, lang: RESULTS_LANG, from: window.from, to: window.to });
  const url = `${IPBL_API_BASE}/calendar?${params}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return { items: [], ok: false, error: `HTTP ${response.status}`, window };
    const raw = await response.json() as unknown;
    return { items: officialOnlineTeamHistoryItems(raw, teamId, tag), ok: true, error: null, window };
  } catch (error) {
    return { items: [], ok: false, error: error instanceof Error ? error.message : String(error), window };
  }
}

async function fetchOfficialRecentCalendarHistoryRows(teamId: number, tag: string): Promise<OfficialRecentCalendarResult> {
  const results = await Promise.all(recentCalendarWindows().map((window) => fetchOfficialRecentCalendarWindow(teamId, tag, window)));
  const byGameId = new Map<number, ReturnType<typeof officialOnlineTeamHistoryItems>[number]>();
  for (const result of results) {
    for (const item of result.items) byGameId.set(item.game.id, item);
  }
  return {
    items: [...byGameId.values()],
    ok: results.some((result) => result.ok),
    error: results.every((result) => !result.ok) ? results.map((result) => result.error).filter(Boolean).join('; ') || 'all recent calendar windows failed' : null,
    windows: results.map((result) => ({ ...result.window, ok: result.ok, itemCount: result.items.length, error: result.error })),
  };
}


export type TeamHistoryRange = 5 | 10 | 30 | "all";

function currentSeason(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric" }).formatToParts(now);
  return Number(parts.find((part) => part.type === "year")?.value ?? now.getUTCFullYear());
}

export type ResolvedTeamHistoryQuery = {
  ok: true;
  teamId: number;
  tag: string;
  season: number;
  range: TeamHistoryRange;
  defaultedSeason: boolean;
} | { ok: false; status: number; error: string };

export function resolveTeamHistoryQuery(search: URLSearchParams, now = new Date()): ResolvedTeamHistoryQuery {
  const teamId = Number(search.get("teamId") ?? "");
  const tag = search.get("tag") ?? "";
  const seasonRaw = search.get("season");
  const season = seasonRaw ? Number(seasonRaw) : currentSeason(now);
  const rangeRaw = search.get("range") ?? "all";
  const range = rangeRaw === "all" ? "all" : Number(rangeRaw);
  if (!Number.isInteger(teamId) || teamId <= 0 || !Number.isInteger(season) || season < 2020 || !tag) {
    return { ok: false, status: 400, error: "Invalid teamId, tag, or season" };
  }
  if (!isApprovedResultsTag(tag)) return { ok: false, status: 400, error: "Unsupported division tag" };
  if (!(range === "all" || range === 5 || range === 10 || range === 30)) {
    return { ok: false, status: 400, error: "Invalid range" };
  }
  return { ok: true, teamId, tag, season, range, defaultedSeason: !seasonRaw };
}

function limitTeamHistoryItems<T>(items: T[], range: TeamHistoryRange): T[] {
  return range === "all" ? items : items.slice(0, range);
}

function requestSearchParams(req: VercelRequest): URLSearchParams {
  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const base = `https://${host || "ipbl-minimal-viewer.vercel.app"}`;
  return new URL(req.url || "/api/teams/history", base).searchParams;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const search = requestSearchParams(req);
  const resolved = resolveTeamHistoryQuery(search);
  if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
  const { teamId, tag, season, range } = resolved;

  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "KV not configured" });

  try {
    const keys = Array.from({ length: 12 }, (_, index) => resultsKvKey(season, index + 1, tag));
    const values = await Promise.all(keys.map((key) => redis.get<unknown>(key)));
    const months = values.map(parseStoredResultsMonth);
    const storedItems = teamHistoryItemsFromMonths(months, teamId, tag);
    const [officialOnline, officialRecentCalendar] = await Promise.all([
      fetchOfficialOnlineHistoryRows(teamId, tag),
      fetchOfficialRecentCalendarHistoryRows(teamId, tag),
    ]);
    const mergedItems = mergeTeamHistoryItems(storedItems, [
      ...officialRecentCalendar.items,
      ...officialOnline.items,
    ]);
    const items = limitTeamHistoryItems(mergedItems, range);
    const loadedMonths = months
      .map((month, index) => month ? index + 1 : null)
      .filter((month): month is number => month !== null);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      data: { items, totalCount: items.length, totalAvailable: mergedItems.length, range },
      coverage: {
        season,
        divisionTag: tag,
        loadedMonths,
        currentOfficialOnline: { ok: officialOnline.ok, itemCount: officialOnline.items.length, error: officialOnline.error },
        recentOfficialCalendar: {
          ok: officialRecentCalendar.ok,
          itemCount: officialRecentCalendar.items.length,
          error: officialRecentCalendar.error,
          windows: officialRecentCalendar.windows,
        },
      },
      source: officialOnline.items.length || officialRecentCalendar.items.length ? "results-kv+official-calendar" : "results-kv",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}
