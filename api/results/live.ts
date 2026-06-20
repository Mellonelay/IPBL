import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCalendarItems, type ScheduleGame } from "../../lib/server/calendar-normalize.js";
import { fetchOfficialJson } from "../../lib/server/ipbl-compat.js";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { readRecordedLiveFeed } from "../../lib/server/live-recorder.js";
import { fetchBookmakerLive, normalizeTeamName, type BookmakerLiveResult } from "../../lib/server/bookmaker-live.js";

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

type OfficialGamePayload = {
  data?: {
    status?: string;
    result?: {
      game?: {
        gameStatus?: string;
        score1?: number;
        score2?: number;
        score?: string;
        fullScore?: string | null;
        localDate?: string;
        localTime?: string;
        scheduledTime?: string | null;
        period?: number | null;
        timeToGo?: string | null;
      };
      status?: { id?: string; displayName?: string };
    };
  };
};

function officialStatusText(raw: unknown): string {
  const payload = raw as OfficialGamePayload;
  const result = payload?.data?.result;
  return [
    payload?.data?.status,
    result?.game?.gameStatus,
    result?.status?.id,
    result?.status?.displayName,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function officialGameDetailIsTerminal(raw: unknown): boolean {
  const text = officialStatusText(raw);
  const terminalIndicators = [
    "result",
    "confirmed",
    "finish",
    "finished",
    "complete",
    "completed",
    "ended",
    "final",
    "заверш",
    "оконч",
    "итог",
    "отмен",
  ];
  return terminalIndicators.some((needle) => text.includes(needle));
}

function scoreText(score1: number, score2: number, explicit?: string): string {
  const text = typeof explicit === "string" ? explicit.trim() : "";
  return text ? text.replace(":", " : ") : `${score1} : ${score2}`;
}

function applyOfficialGameDetail(game: ScheduleGame, raw: unknown): ScheduleGame | null {
  if (officialGameDetailIsTerminal(raw)) return null;
  const payload = raw as OfficialGamePayload;
  const official = payload?.data?.result?.game;
  if (!official) return game;
  const score1 = typeof official.score1 === "number" && Number.isFinite(official.score1) ? official.score1 : game.score1;
  const score2 = typeof official.score2 === "number" && Number.isFinite(official.score2) ? official.score2 : game.score2;
  return myanmar({
    ...game,
    status: official.gameStatus ?? game.status,
    statusDisplay: payload?.data?.result?.status?.displayName ?? game.statusDisplay,
    upstreamStatusId: payload?.data?.result?.status?.id ?? "official-detail",
    score1,
    score2,
    scoreText: scoreText(score1, score2, official.score),
    fullScore: official.fullScore ?? game.fullScore,
    period: typeof official.period === "number" ? official.period : game.period,
    timeToGo: typeof official.timeToGo === "string" ? official.timeToGo : game.timeToGo,
    scheduledTime: official.scheduledTime ?? game.scheduledTime,
    localDate: official.localDate ?? game.localDate,
    localTime: official.localTime ?? game.localTime,
    sourceLocalDate: official.localDate ?? game.sourceLocalDate,
    sourceLocalTime: official.localTime ?? game.sourceLocalTime,
  });
}

export async function reconcileLiveGamesWithOfficialDetail(games: ScheduleGame[]): Promise<{ games: ScheduleGame[]; checked: number; dropped: number; updated: number }> {
  const reconciled = await Promise.all(games.map(async (game) => {
    const official = await fetchOfficialJson("/games/game", new URLSearchParams({ id: String(game.gameId), tag: game.tag, lang: "ru" }));
    if (!official) return { game, checked: 0, dropped: 0, updated: 0 };
    const next = applyOfficialGameDetail(game, official);
    if (!next) return { game: null, checked: 1, dropped: 1, updated: 0 };
    const updated = next.score1 !== game.score1 || next.score2 !== game.score2 || next.status !== game.status || next.upstreamStatusId !== game.upstreamStatusId ? 1 : 0;
    return { game: next, checked: 1, dropped: 0, updated };
  }));
  return {
    games: reconciled.map((row) => row.game).filter((game): game is ScheduleGame => game !== null),
    checked: reconciled.reduce((sum, row) => sum + row.checked, 0),
    dropped: reconciled.reduce((sum, row) => sum + row.dropped, 0),
    updated: reconciled.reduce((sum, row) => sum + row.updated, 0),
  };
}

async function reconcileLiveFeedEnvelope(envelope: LiveFeedEnvelope): Promise<LiveFeedEnvelope> {
  const reconciliation = await reconcileLiveGamesWithOfficialDetail(envelope.games);
  return {
    games: reconciliation.games,
    status: {
      ...envelope.status,
      officialReconciliation: {
        checked: reconciliation.checked,
        dropped: reconciliation.dropped,
        updated: reconciliation.updated,
      },
    },
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

type LiveFeedDependencies = {
  getResultsRedis?: typeof getResultsRedis;
  readRecordedLiveFeed?: typeof readRecordedLiveFeed;
  fetchLiveTag?: typeof fetchLiveTag;
  fetchBookmakerLive?: typeof fetchBookmakerLive;
  reconcileLiveGamesWithOfficialDetail?: typeof reconcileLiveGamesWithOfficialDetail;
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

export async function buildLiveFeedEnvelope(deps: LiveFeedDependencies = {}): Promise<LiveFeedEnvelope> {
  const getRedis = deps.getResultsRedis ?? getResultsRedis;
  const readFeed = deps.readRecordedLiveFeed ?? readRecordedLiveFeed;
  const fetchLive = deps.fetchLiveTag ?? fetchLiveTag;
  const fetchBookmaker = deps.fetchBookmakerLive ?? fetchBookmakerLive;

  let recordedEnvelope: LiveFeedEnvelope | null = null;
  const redis = getRedis();
  if (redis) {
    try {
      recordedEnvelope = await readFeed(redis);
    } catch {
      // Fall through to the live fetch path only if recorder access fails.
    }
  }

  const started = Date.now();
  const [batches, bookmakerSettled] = await Promise.all([
    Promise.all(LIVE_TAGS.map(fetchLive)),
    fetchBookmaker()
      .then((fallback): { ok: true; fallback: BookmakerLiveResult } => ({ ok: true, fallback }))
      .catch((error): { ok: false; error: unknown } => ({ ok: false, error })),
  ]);
  const failures = batches.filter((batch) => batch.error).map(({ tag, error }) => ({ tag, error }));
  const byId = new Map<string, ScheduleGame>();
  for (const batch of batches) for (const game of batch.games) byId.set(`${game.tag}:${game.gameId}`, game);
  const officialGames = [...byId.values()].sort((a, b) => a.localTime.localeCompare(b.localTime));
  const fallback = bookmakerSettled.ok ? bookmakerSettled.fallback : null;
  const bookmakerGames = fallback?.games ?? [];
  const bookmakerFallbackFailures = bookmakerSettled.ok
    ? fallback?.sourceFailures ?? []
    : ((bookmakerSettled.error as Error & { sourceFailures?: BookmakerLiveResult["sourceFailures"] }).sourceFailures ?? [{ error: bookmakerSettled.error instanceof Error ? bookmakerSettled.error.message : String(bookmakerSettled.error) }]);
  const liveCandidateGames = bookmakerGames.length > 0 ? bookmakerGames : mergeLiveGamesByFreshness(officialGames, bookmakerGames);
  const officialReconciliation = await reconcileLiveGamesWithOfficialDetail(liveCandidateGames);
  const mergedGames = officialReconciliation.games;

  if (mergedGames.length > 0) {
    const bookmakerHealthy = !fallback || fallback.sourceFailures.length === 0;
    const officialHealthy = failures.length === 0;
    const source = bookmakerGames.length > 0
      ? "bookmaker:melbet.com+1xbet.com"
      : officialGames.length > 0
        ? "official:api1.ipbl.pro"
        : "bookmaker:melbet.com+1xbet.com";
    return {
      games: mergedGames,
      status: {
        lastSyncAt: new Date().toISOString(),
        status: bookmakerGames.length > 0
          ? bookmakerHealthy ? "OK" : "PARTIAL"
          : officialHealthy && bookmakerHealthy ? "OK" : "PARTIAL",
        source,
        fallbackFrom: officialGames.length > 0 ? null : "official:api1.ipbl.pro",
        requestedDivisions: LIVE_TAGS.length,
        successfulDivisions: new Set(mergedGames.map((game) => game.tag)).size,
        failures,
        bookmakerSourceLeagues: fallback?.sourceLeagues ?? [],
        bookmakerSourceFailures: bookmakerFallbackFailures,
        receivedBookmakerEvents: fallback?.receivedEvents ?? 0,
        unmatchedBookmakerEvents: fallback?.unmatched ?? [],
        officialReconciliation: {
          checked: officialReconciliation.checked,
          dropped: officialReconciliation.dropped,
          updated: officialReconciliation.updated,
        },
        latencyMs: Date.now() - started,
        displayTimeZone: "Asia/Yangon",
      },
    };
  }

  if (recordedEnvelope?.games.length) {
    return await reconcileLiveFeedEnvelope(recordedEnvelope);
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
        ...bookmakerFallbackFailures,
      ],
      bookmakerSourceLeagues: bookmakerSettled.ok ? bookmakerSettled.fallback.sourceLeagues : [],
      bookmakerSourceFailures: bookmakerFallbackFailures,
      receivedBookmakerEvents: bookmakerSettled.ok ? bookmakerSettled.fallback.receivedEvents : 0,
      unmatchedBookmakerEvents: bookmakerSettled.ok ? bookmakerSettled.fallback.unmatched : [],
      officialReconciliation: typeof officialReconciliation === "undefined" ? { checked: 0, dropped: 0, updated: 0 } : {
        checked: officialReconciliation.checked,
        dropped: officialReconciliation.dropped,
        updated: officialReconciliation.updated,
      },
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
