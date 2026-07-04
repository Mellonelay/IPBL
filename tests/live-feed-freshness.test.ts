import assert from "node:assert/strict";
import { buildLiveFeedEnvelope, mergeLiveGamesByFreshness, officialGameDetailIsTerminal, reconcileLiveGamesWithOfficialDetail } from "../api/results/live.ts";
import type { LiveFeedEnvelope } from "../api/results/live.ts";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";

void (async () => {
function game(overrides: Partial<ScheduleGame>): ScheduleGame {
  return {
    gameId: 100,
    tag: "ipbl-66-m-pro-a",
    status: "Online",
    statusDisplay: "Live",
    upstreamStatusId: null,
    score1: 7,
    score2: 2,
    scoreText: "7 : 2",
    fullScore: null,
    localDate: "15.06.2026",
    localTime: "14:30",
    divisionLabel: "Pro Men A",
    period: 1,
    timeToGo: "08:10",
    timeIsGo: 1,
    isLive: true,
    updatedAt: 1_781_510_522_000,
    scheduledTime: null,
    sourceLocalDate: null,
    sourceLocalTime: null,
    sourceTimeZone: null,
    displayTimeZone: "Asia/Yangon",
    team1: { teamId: 76038, shortName: "Barnaul", name: "Barnaul" },
    team2: { teamId: 76041, shortName: "Sochi", name: "Sochi" },
    ...overrides,
  };
}

const official = game({});
const bookmaker = game({
  gameId: 729342100,
  score1: 23,
  score2: 18,
  scoreText: "23 : 18",
  timeToGo: "04:02",
  updatedAt: 1_781_510_820_000,
});

const merged = mergeLiveGamesByFreshness([official], [bookmaker]);

assert.equal(merged.length, 1);
assert.equal(merged[0].gameId, bookmaker.gameId);
assert.equal(merged[0].scoreText, "23 : 18");
assert.equal(merged[0].timeToGo, "04:02");

console.log("Live feed freshness merge tests passed");


const terminalOfficialPayload = {
  data: {
    status: "Ok",
    result: {
      game: { gameStatus: "ResultConfirmed", score1: 101, score2: 96 },
      status: { id: "ResultConfirmed", displayName: "Завершена" },
    },
  },
};

assert.equal(officialGameDetailIsTerminal(terminalOfficialPayload), true);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify(terminalOfficialPayload), {
  status: 200,
  headers: { "content-type": "application/json" },
});
try {
  const staleGhost = game({
    gameId: 1073505,
    tag: "ipbl-66-w-pro-a",
    score1: 81,
    score2: 76,
    scoreText: "81 : 76",
    team1: { teamId: 76021, shortName: "Bryansk", name: "Bryansk" },
    team2: { teamId: 76023, shortName: "Izhevsk", name: "Izhevsk" },
    upstreamStatusId: "melbet-live",
    sourceTimeZone: "bookmaker-epoch",
  });
  const reconciled = await reconcileLiveGamesWithOfficialDetail([staleGhost]);
  assert.equal(reconciled.checked, 1);
  assert.equal(reconciled.dropped, 1);
  assert.equal(reconciled.games.length, 0);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Official-detail live reconciliation tests passed");

class EmptyRecorderRedis {
  async get() { return { sourceDetails: { source: "official:api1.ipbl.pro", status: "OK" }, activeGameKeys: [] }; }
  async smembers() { return []; }
}

const liveFallbackGame = game({
  gameId: 700,
  tag: "ipbl-66-m-pro-a",
  team1: { teamId: 76038, shortName: "Barnaul", name: "Barnaul" },
  team2: { teamId: 76041, shortName: "Sochi", name: "Sochi" },
  score1: 12,
  score2: 9,
  scoreText: "12 : 9",
  updatedAt: 2_000_000,
});

const fallbackEnvelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => new EmptyRecorderRedis() as never,
  readRecordedLiveFeed: async () => ({ games: [], status: { source: "official:api1.ipbl.pro", status: "OK" } }) satisfies LiveFeedEnvelope,
  fetchLiveTag: async (tag: string) => tag === liveFallbackGame.tag ? { tag, games: [liveFallbackGame] } : { tag, games: [] },
  fetchBookmakerLive: async () => ({ games: [], unmatched: [], receivedEvents: 0, sourceLeagues: [], sourceFailures: [] }),
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(fallbackEnvelope.games.length, 1, "empty recorder state must not suppress fresh live fetches");
assert.equal(fallbackEnvelope.games[0].gameId, liveFallbackGame.gameId);

console.log("Live envelope empty-recorder fallback test passed");

const staleRecordedGame = game({
  gameId: 730322521,
  tag: "ipbl-66-w-pro-a",
  team1: { teamId: 76022, shortName: "Magnitogorsk", name: "Magnitogorsk" },
  team2: { teamId: 76023, shortName: "Izhevsk", name: "Izhevsk" },
  score1: 60,
  score2: 63,
  scoreText: "60 : 63",
  updatedAt: 1_500_000,
});

const liveWinsOverRecorderEnvelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => new EmptyRecorderRedis() as never,
  readRecordedLiveFeed: async () => ({
    games: [staleRecordedGame],
    status: { source: "recorder", status: "OK" },
  }) satisfies LiveFeedEnvelope,
  fetchLiveTag: async () => ({
    tag: liveFallbackGame.tag,
    games: [liveFallbackGame],
  }),
  fetchBookmakerLive: async () => ({ games: [], unmatched: [], receivedEvents: 0, sourceLeagues: [], sourceFailures: [] }),
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(liveWinsOverRecorderEnvelope.games.length, 1);
assert.equal(liveWinsOverRecorderEnvelope.games[0].gameId, liveFallbackGame.gameId);
assert.equal(liveWinsOverRecorderEnvelope.games[0].team1.shortName, "Barnaul");

console.log("Live envelope live-feed precedence over recorder tests passed");
const officialLiveGame = game({
  gameId: 730323684,
  tag: "ipbl-66-m-pro-b",
  team1: { teamId: 76051, shortName: "Kazan", name: "Kazan" },
  team2: { teamId: 76052, shortName: "Tyumen", name: "Tyumen" },
  score1: 55,
  score2: 64,
  scoreText: "55 : 64",
  period: 2,
  timeToGo: "04:10",
  updatedAt: 1_000_000,
});

const bookmakerPreferredGame = game({
  gameId: 730347660,
  tag: "ipbl-66-w-pro-b",
  team1: { teamId: 76012, shortName: "Cheboksary", name: "Cheboksary" },
  team2: { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl" },
  score1: 82,
  score2: 65,
  scoreText: "82 : 65",
  period: 3,
  timeToGo: null,
  updatedAt: 2_000_000,
});

let mergedBookmakerCalls = 0;
const mergedOfficialAndBookmakerEnvelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => new EmptyRecorderRedis() as never,
  readRecordedLiveFeed: async () => ({ games: [], status: { source: "official:api1.ipbl.pro", status: "OK" } }) satisfies LiveFeedEnvelope,
  fetchLiveTag: async (tag: string) => tag === officialLiveGame.tag ? { tag, games: [officialLiveGame] } : { tag, games: [] },
  fetchBookmakerLive: async () => {
    mergedBookmakerCalls += 1;
    return {
      games: [bookmakerPreferredGame],
      unmatched: [],
      receivedEvents: 1,
      sourceLeagues: [2496666, 2496667],
      sourceFailures: [],
    };
  },
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(mergedOfficialAndBookmakerEnvelope.games.length, 2);
assert.equal(mergedOfficialAndBookmakerEnvelope.games.some((game) => game.gameId === officialLiveGame.gameId), true);
assert.equal(mergedOfficialAndBookmakerEnvelope.games.some((game) => game.gameId === bookmakerPreferredGame.gameId), true);
assert.equal(mergedBookmakerCalls, 1, "bookmaker fetch must run even when official live rows already exist");

console.log("Live envelope official+bookmaker merge test passed");

let fallbackBookmakerCalls = 0;
const bookmakerFallbackEnvelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => new EmptyRecorderRedis() as never,
  readRecordedLiveFeed: async () => ({ games: [], status: { source: "official:api1.ipbl.pro", status: "OK" } }) satisfies LiveFeedEnvelope,
  fetchLiveTag: async () => ({ tag: bookmakerPreferredGame.tag, games: [] }),
  fetchBookmakerLive: async () => {
    fallbackBookmakerCalls += 1;
    return {
      games: [bookmakerPreferredGame],
      unmatched: [],
      receivedEvents: 1,
      sourceLeagues: [2496666],
      sourceFailures: [],
    };
  },
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(bookmakerFallbackEnvelope.games.length, 1);
assert.equal(bookmakerFallbackEnvelope.games[0].gameId, bookmakerPreferredGame.gameId);
assert.equal(fallbackBookmakerCalls, 1, "bookmaker fetch must run when official live rows are empty");

console.log("Live envelope bookmaker fallback test passed");

const bookmakerFailure = new Error("melbet:zero_approved_games: bookmaker source returned live rows, but none matched the approved team registry");
(bookmakerFailure as Error & { sourceFailures?: unknown[] }).sourceFailures = [
  { leagueId: 2496666, error: "bookmaker source returned live rows, but none matched the approved team registry", source: "melbet", kind: "zero_approved_games" },
  { leagueId: 2496667, error: "bookmaker source returned live rows, but none matched the approved team registry", source: "melbet", kind: "zero_approved_games" },
];
const classifiedFailureEnvelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => new EmptyRecorderRedis() as never,
  readRecordedLiveFeed: async () => ({ games: [], status: { source: "official:api1.ipbl.pro", status: "OK" } }) satisfies LiveFeedEnvelope,
  fetchLiveTag: async () => ({ tag: bookmakerPreferredGame.tag, games: [] }),
  fetchBookmakerLive: async () => { throw bookmakerFailure; },
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(classifiedFailureEnvelope.status.bookmakerSourceFailures[0].kind, "zero_approved_games");
assert.equal(classifiedFailureEnvelope.status.bookmakerSourceFailures[0].source, "melbet");
assert.equal(classifiedFailureEnvelope.status.bookmakerSourceFailures[0].leagueId, 2496666);

console.log("Live envelope bookmaker failure classification test passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
