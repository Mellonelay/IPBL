import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { fetchSupabaseTeamHistoryRows } from "../../lib/server/supabase-team-history.js";
import {
  planTeamHistoryResponse,
  sanitizeTeamHistorySourceError,
  type TeamHistoryRange,
} from "../../lib/server/team-history-response.js";
import { IPBL_API_BASE, RESULTS_LANG, normalizeResultsDivisionTag, resultsKvKey } from "../../lib/server/results-sync-constants.js";
import { teamsForDivision } from "../../src/config/teams.js";
import {
  mergeTeamHistoryItems,
  officialOnlineTeamHistoryItems,
  parseStoredResultsMonth,
  teamHistoryItemsFromMonths,
} from "../../lib/server/team-history-from-results.js";

export const config = { maxDuration: 60 };

const HISTORY_FETCH_TIMEOUT_MS = 8_000;

async function fetchJsonWithTimeout(url: string, timeoutMs = HISTORY_FETCH_TIMEOUT_MS): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    return { ok: true, data: await response.json() as unknown };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, error: `timeout after ${timeoutMs}ms` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}


async function fetchOfficialOnlineHistoryRows(teamId: number, tag: string): Promise<{ items: ReturnType<typeof officialOnlineTeamHistoryItems>; ok: boolean; error: string | null }> {
  const url = `${IPBL_API_BASE}/calendar/online?tag=${encodeURIComponent(tag)}&lang=${encodeURIComponent(RESULTS_LANG)}`;
  const result = await fetchJsonWithTimeout(url);
  if (!result.ok) return { items: [], ok: false, error: result.error };
  return { items: officialOnlineTeamHistoryItems(result.data, teamId, tag), ok: true, error: null };
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
  const result = await fetchJsonWithTimeout(url);
  if (!result.ok) return { items: [], ok: false, error: result.error, window };
  return { items: officialOnlineTeamHistoryItems(result.data, teamId, tag), ok: true, error: null, window };
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
  const requestedTag = search.get("tag") ?? search.get("division") ?? "";
  const tag = normalizeResultsDivisionTag(requestedTag) ?? "ipbl-66-m-pro-a";
  const seasonRaw = search.get("season");
  const season = seasonRaw ? Number(seasonRaw) : currentSeason(now);
  const requestedTeamId = Number(search.get("teamId") ?? search.get("team") ?? "");
  const rangeRaw = search.get("range") ?? "all";
  const range = rangeRaw === "all" ? "all" : Number(rangeRaw);
  const teamCandidates = teamsForDivision(tag);
  const teamId = Number.isInteger(requestedTeamId) && requestedTeamId > 0
    ? requestedTeamId
    : teamCandidates[0]?.teamId ?? 0;
  if (!Number.isInteger(teamId) || teamId <= 0 || !Number.isInteger(season) || season < 2020 || !tag) {
    return { ok: false, status: 400, error: "Invalid teamId, tag, or season" };
  }
  if (!(range === "all" || range === 5 || range === 10 || range === 30)) {
    return { ok: false, status: 400, error: "Invalid range" };
  }
  return { ok: true, teamId, tag, season, range, defaultedSeason: !seasonRaw };
}

type LegacyStoredHistoryResult = {
  configured: boolean;
  ok: boolean;
  items: ReturnType<typeof teamHistoryItemsFromMonths>;
  loadedMonths: number[];
  error: string | null;
};


async function fetchLegacyStoredHistoryRows(
  teamId: number,
  tag: string,
  season: number
): Promise<LegacyStoredHistoryResult> {
  const redis = getResultsRedis();
  if (!redis) return { configured: false, ok: false, items: [], loadedMonths: [], error: "not configured" };

  try {
    const keys = Array.from({ length: 12 }, (_, index) => resultsKvKey(season, index + 1, tag));
    const values = await redis.mget(...keys) as unknown[];
    const months = values.map(parseStoredResultsMonth);
    return {
      configured: true,
      ok: true,
      items: teamHistoryItemsFromMonths(months, teamId, tag),
      loadedMonths: months
        .map((month, index) => month ? index + 1 : null)
        .filter((month): month is number => month !== null),
      error: null,
    };
  } catch (error) {
    return { configured: true, ok: false, items: [], loadedMonths: [], error: sanitizeTeamHistorySourceError(error) };
  }
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

  const [supabaseHistory, officialOnline, officialRecentCalendar, legacyHistory] = await Promise.all([
    fetchSupabaseTeamHistoryRows(teamId, tag),
    fetchOfficialOnlineHistoryRows(teamId, tag),
    fetchOfficialRecentCalendarHistoryRows(teamId, tag),
    fetchLegacyStoredHistoryRows(teamId, tag, season),
  ]);

  const officialItems = [
    ...officialRecentCalendar.items,
    ...officialOnline.items,
  ];
  const legacyAndOfficial = mergeTeamHistoryItems(legacyHistory.items, officialItems);
  const mergedItems = mergeTeamHistoryItems(legacyAndOfficial, supabaseHistory.items);

  const successfulSources = [
    supabaseHistory.ok ? "supabase" : null,
    officialOnline.ok ? "official-online" : null,
    officialRecentCalendar.ok ? "official-calendar" : null,
    legacyHistory.ok ? "results-kv" : null,
  ].filter((value): value is string => Boolean(value));
  const failedSources = [
    !supabaseHistory.ok ? "supabase" : null,
    !officialOnline.ok ? "official-online" : null,
    !officialRecentCalendar.ok ? "official-calendar" : null,
    !legacyHistory.ok ? "results-kv" : null,
  ].filter((value): value is string => Boolean(value));

  const coverage = {
    season,
    divisionTag: tag,
    checkedAt: new Date().toISOString(),
    supabase: {
      configured: supabaseHistory.configured,
      ok: supabaseHistory.ok,
      itemCount: supabaseHistory.items.length,
      error: supabaseHistory.error ? sanitizeTeamHistorySourceError(supabaseHistory.error) : null,
    },
    currentOfficialOnline: {
      ok: officialOnline.ok,
      itemCount: officialOnline.items.length,
      error: officialOnline.error,
    },
    recentOfficialCalendar: {
      ok: officialRecentCalendar.ok,
      itemCount: officialRecentCalendar.items.length,
      error: officialRecentCalendar.error,
      windows: officialRecentCalendar.windows,
    },
    legacyResults: {
      configured: legacyHistory.configured,
      ok: legacyHistory.ok,
      itemCount: legacyHistory.items.length,
      loadedMonths: legacyHistory.loadedMonths,
      error: legacyHistory.error,
    },
  };

  const sourceParts = [
    supabaseHistory.items.length ? "supabase" : null,
    officialItems.length ? "official-calendar" : null,
    legacyHistory.items.length ? "results-kv" : null,
  ].filter((value): value is string => Boolean(value));
  const plan = planTeamHistoryResponse({
    mergedItems,
    range,
    successfulSources,
    failedSources,
    sourceParts,
    coverage,
  });

  res.setHeader(
    "Cache-Control",
    plan.status === 503 ? "no-store, max-age=0" : "s-maxage=60, stale-while-revalidate=300",
  );
  res.setHeader("X-IPBL-History-Availability", plan.availability);
  res.setHeader("X-IPBL-History-Source", plan.source);
  return res.status(plan.status).json(plan.body);
}