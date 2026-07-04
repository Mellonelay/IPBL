import { parseCalendarItems, type ScheduleGame } from "../../lib/server/calendar-normalize.js";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { readRecordedLiveFeed } from "../../lib/server/live-recorder.js";
import { fetchBookmakerLive, normalizeTeamName, type BookmakerLiveResult } from "../../lib/server/bookmaker-live.js";
import { buildLiveFeedStatus } from "./live-feed-status.js";
import { normalizeLiveGame } from "./live-normalize.js";
import { reconcileLiveGamesWithOfficialDetail } from "./live-reconciliation.js";

export { officialGameDetailIsTerminal } from "./live-reconciliation.js";
export { reconcileLiveGamesWithOfficialDetail } from "./live-reconciliation.js";

const PROXY_BASE = "https://worker.mloneslot99.com/ipbl-proxy";
export const LIVE_TAGS = [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d", "ipbl-66-m-pro-u", "ipbl-66-m-pro-z", "ipbl-66-m-pro-l",
  "ipbl-66-w-pro-a", "ipbl-66-w-pro-b", "ipbl-66-w-pro-c", "ipbl-66-w-pro-d", "ipbl-66-w-pro-g", "ipbl-66-w-pro-k",
] as const;

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
    return { tag, games: parseCalendarItems(raw, tag).filter((game) => game.isLive).map(normalizeLiveGame) };
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
  const bookmakerSettledPromise: Promise<
    | { ok: true; fallback: BookmakerLiveResult }
    | { ok: false; error: unknown }
  > = fetchBookmaker()
    .then((fallback): { ok: true; fallback: BookmakerLiveResult } => ({ ok: true, fallback }))
    .catch((error): { ok: false; error: unknown } => ({ ok: false, error }));
  const batches = await Promise.all(LIVE_TAGS.map(fetchLive));
  const failures = batches.filter((batch) => batch.error).map(({ tag, error }) => ({ tag, error }));
  const byId = new Map<string, ScheduleGame>();
  for (const batch of batches) for (const game of batch.games) byId.set(`${game.tag}:${game.gameId}`, game);
  const officialGames = [...byId.values()].sort((a, b) => a.localTime.localeCompare(b.localTime));
  const bookmakerSettled = await bookmakerSettledPromise;
  const fallback = bookmakerSettled?.ok ? bookmakerSettled.fallback : null;
  const bookmakerGames = fallback?.games ?? [];
  const liveCandidateGames = mergeLiveGamesByFreshness(officialGames, bookmakerGames);
  const officialReconciliation = await reconcileLiveGamesWithOfficialDetail(liveCandidateGames);
  const mergedGames = officialReconciliation.games;

  if (mergedGames.length > 0) {
    return {
      games: mergedGames,
      status: buildLiveFeedStatus({
        started,
        requestedDivisions: LIVE_TAGS.length,
        failures,
        bookmakerSettled,
        officialGames,
        bookmakerGames,
        mergedGames,
        officialReconciliation: {
          checked: officialReconciliation.checked,
          dropped: officialReconciliation.dropped,
          updated: officialReconciliation.updated,
        },
      }),
    };
  }

  if (recordedEnvelope?.games.length) {
    return await reconcileLiveFeedEnvelope(recordedEnvelope);
  }

  return {
    games: [],
    status: buildLiveFeedStatus({
      started,
      requestedDivisions: LIVE_TAGS.length,
      failures,
      bookmakerSettled,
      officialGames,
      bookmakerGames,
      mergedGames,
      officialReconciliation: typeof officialReconciliation === "undefined"
        ? { checked: 0, dropped: 0, updated: 0 }
        : {
            checked: officialReconciliation.checked,
            dropped: officialReconciliation.dropped,
            updated: officialReconciliation.updated,
          },
    }),
  };
}
