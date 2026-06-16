import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCalendarItems, type ScheduleGame } from "../../lib/server/calendar-normalize.js";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { readRecordedLiveFeed } from "../../lib/server/live-recorder.js";
import { fetchMelbetLive, normalizeTeamName, type BookmakerLiveResult } from "../../lib/server/bookmaker-live.js";

const PROXY_BASE = "https://worker.mloneslot99.com/ipbl-proxy";
export const LIVE_TAGS = [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d", "ipbl-66-m-pro-u", "ipbl-66-m-pro-z", "ipbl-66-m-pro-l",
  "ipbl-66-w-pro-a", "ipbl-66-w-pro-b", "ipbl-66-w-pro-c", "ipbl-66-w-pro-d", "ipbl-66-w-pro-g", "ipbl-66-w-pro-k",
] as const;
const LABELS: Record<string, string> = {
  "ipbl-66-m-pro-a": "Pro Men A", "ipbl-66-m-pro-b": "Pro Men B", "ipbl-66-m-pro-c": "Pro Men C",
  "ipbl-66-m-pro-d": "Pro Men D", "ipbl-66-m-pro-u": "Pro Men U", "ipbl-66-m-pro-z": "Pro Men Z", "ipbl-66-m-pro-l": "Pro Men L",
  "ipbl-66-w-pro-a": "Pro Women A", "ipbl-66-w-pro-b": "Pro Women B", "ipbl-66-w-pro-c": "Pro Women C",
  "ipbl-66-w-pro-d": "Pro Women D", "ipbl-66-w-pro-g": "Pro Women G", "ipbl-66-w-pro-k": "Pro Women K",
};

function myanmar(game: ScheduleGame): ScheduleGame {
  const candidate = game.scheduledTime || (game.localDate && game.localTime
    ? `${game.localDate.split(".").reverse().join("-")}T${game.localTime}:00+05:00` : "");
  const date = candidate ? new Date(candidate) : null;
  if (!date || Number.isNaN(date.getTime())) return { ...game, divisionLabel: LABELS[game.tag] ?? game.divisionLabel };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    ...game,
    sourceLocalDate: game.localDate,
    sourceLocalTime: game.localTime,
    sourceTimeZone: "UTC+05:00",
    displayTimeZone: "Asia/Yangon",
    localDate: `${get("day")}.${get("month")}.${get("year")}`,
    localTime: `${get("hour")}:${get("minute")}`,
    divisionLabel: LABELS[game.tag] ?? game.divisionLabel,
  };
}

export async function fetchLiveTag(tag: string): Promise<{ tag: string; games: ScheduleGame[]; error?: string }> {
  const url = `${PROXY_BASE}/calendar/online?${new URLSearchParams({ tag, lang: "ru" })}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return { tag, games: [], error: `HTTP ${response.status}` };
    const raw = await response.json();
    return { tag, games: parseCalendarItems(raw, tag).filter((game) => game.isLive).map(myanmar) };
  } catch (error) {
    return { tag, games: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export type LiveFeedEnvelope = {
  games: ScheduleGame[];
  status: Record<string, unknown>;
};

function matchupKey(game: ScheduleGame): string {
  return [
    game.tag,
    normalizeTeamName(game.team1.name || game.team1.shortName),
    normalizeTeamName(game.team2.name || game.team2.shortName),
  ].join(":");
}

function timestamp(game: ScheduleGame): number {
  return typeof game.updatedAt === "number" && Number.isFinite(game.updatedAt) ? game.updatedAt : 0;
}

export function mergeLiveGamesByFreshness(
  officialGames: ScheduleGame[],
  bookmakerGames: ScheduleGame[],
): ScheduleGame[] {
  const byMatchup = new Map<string, ScheduleGame>();
  for (const game of officialGames) byMatchup.set(matchupKey(game), game);
  for (const game of bookmakerGames) {
    const key = matchupKey(game);
    const existing = byMatchup.get(key);
    if (!existing || timestamp(game) >= timestamp(existing)) byMatchup.set(key, game);
  }
  return [...byMatchup.values()].sort((a, b) => a.localTime.localeCompare(b.localTime));
}

export async function buildLiveFeedEnvelope(): Promise<LiveFeedEnvelope> {
  const redis = getResultsRedis();
  if (redis) {
    try {
      return await readRecordedLiveFeed(redis);
    } catch {
      // Fall through to legacy fetch path only if recorder access fails.
    }
  }

  const started = Date.now();
  const [batches, bookmakerSettled] = await Promise.all([
    Promise.all(LIVE_TAGS.map(fetchLiveTag)),
    fetchMelbetLive()
      .then((fallback): { ok: true; fallback: BookmakerLiveResult } => ({ ok: true, fallback }))
      .catch((error): { ok: false; error: unknown } => ({ ok: false, error })),
  ]);
  const failures = batches.filter((batch) => batch.error).map(({ tag, error }) => ({ tag, error }));
  const byId = new Map<string, ScheduleGame>();
  for (const batch of batches) for (const game of batch.games) byId.set(`${game.tag}:${game.gameId}`, game);
  const officialGames = [...byId.values()].sort((a, b) => a.localTime.localeCompare(b.localTime));
  const fallback = bookmakerSettled.ok ? bookmakerSettled.fallback : null;
  const bookmakerGames = fallback?.games ?? [];
  const mergedGames = mergeLiveGamesByFreshness(officialGames, bookmakerGames);

  if (mergedGames.length > 0) {
    const source = officialGames.length > 0 && bookmakerGames.length > 0
      ? "official:api1.ipbl.pro+bookmaker:melbet.com"
      : officialGames.length > 0
        ? "official:api1.ipbl.pro"
        : "bookmaker:melbet.com";
    return {
      games: mergedGames,
      status: {
        lastSyncAt: new Date().toISOString(),
        status: failures.length === 0 && (!fallback || (fallback.unmatched.length === 0 && fallback.sourceFailures.length === 0)) ? "OK" : "PARTIAL",
        source,
        fallbackFrom: officialGames.length > 0 ? null : "official:api1.ipbl.pro",
        requestedDivisions: LIVE_TAGS.length,
        successfulDivisions: new Set(mergedGames.map((game) => game.tag)).size,
        failures,
        bookmakerSourceLeagues: fallback?.sourceLeagues ?? [],
        bookmakerSourceFailures: fallback?.sourceFailures ?? (bookmakerSettled.ok ? [] : [{ error: bookmakerSettled.error instanceof Error ? bookmakerSettled.error.message : String(bookmakerSettled.error) }]),
        receivedBookmakerEvents: fallback?.receivedEvents ?? 0,
        unmatchedBookmakerEvents: fallback?.unmatched ?? [],
        latencyMs: Date.now() - started,
        displayTimeZone: "Asia/Yangon",
      },
    };
  }

  return {
    games: [],
    status: {
      lastSyncAt: new Date().toISOString(),
      status: bookmakerSettled.ok && bookmakerSettled.fallback.sourceFailures.length === 0 ? "IDLE" : "FAIL",
      source: "none",
      fallbackFrom: "official:api1.ipbl.pro",
      requestedDivisions: LIVE_TAGS.length,
      successfulDivisions: 0,
      failures: [
        ...failures,
        ...(bookmakerSettled.ok ? bookmakerSettled.fallback.sourceFailures : [{ tag: "bookmaker:melbet.com", error: bookmakerSettled.error instanceof Error ? bookmakerSettled.error.message : String(bookmakerSettled.error) }]),
      ],
      bookmakerSourceLeagues: bookmakerSettled.ok ? bookmakerSettled.fallback.sourceLeagues : [],
      bookmakerSourceFailures: bookmakerSettled.ok ? bookmakerSettled.fallback.sourceFailures : [{ error: bookmakerSettled.error instanceof Error ? bookmakerSettled.error.message : String(bookmakerSettled.error) }],
      receivedBookmakerEvents: bookmakerSettled.ok ? bookmakerSettled.fallback.receivedEvents : 0,
      unmatchedBookmakerEvents: bookmakerSettled.ok ? bookmakerSettled.fallback.unmatched : [],
      latencyMs: Date.now() - started,
      displayTimeZone: "Asia/Yangon",
    },
  };
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  return res.status(200).json(await buildLiveFeedEnvelope());
}
