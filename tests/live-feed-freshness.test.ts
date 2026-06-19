import assert from "node:assert/strict";
import { buildLiveFeedEnvelope, mergeLiveGamesByFreshness, officialGameDetailIsTerminal, reconcileLiveGamesWithOfficialDetail } from "../api/results/live.ts";
import type { LiveFeedEnvelope } from "../api/results/live.ts";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";

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

const bookmakerPreferredGame = game({
  gameId: 730347660,
  tag: "ipbl-66-m-pro-b",
  team1: { teamId: 76050, shortName: "Krasnodar", name: "Krasnodar" },
  team2: { teamId: 76052, shortName: "Tyumen", name: "Tyumen" },
  score1: 82,
  score2: 65,
  scoreText: "82 : 65",
  period: 3,
  timeToGo: null,
  updatedAt: 2_000_000,
});

const bookmakerPreferredEnvelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => new EmptyRecorderRedis() as never,
  readRecordedLiveFeed: async () => ({ games: [], status: { source: "official:api1.ipbl.pro", status: "OK" } }) satisfies LiveFeedEnvelope,
  fetchLiveTag: async () => ({
    tag: bookmakerPreferredGame.tag,
    games: [game({
      gameId: 730323684,
      tag: "ipbl-66-m-pro-b",
      team1: { teamId: 76051, shortName: "Kazan", name: "Kazan" },
      team2: { teamId: 76052, shortName: "Tyumen", name: "Tyumen" },
      score1: 55,
      score2: 64,
      scoreText: "55 : 64",
      updatedAt: 1_000_000,
    })],
  }),
  fetchBookmakerLive: async () => ({
    games: [bookmakerPreferredGame],
    unmatched: [],
    receivedEvents: 1,
    sourceLeagues: [2496666],
    sourceFailures: [],
  }),
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(bookmakerPreferredEnvelope.games.length, 1);
assert.equal(bookmakerPreferredEnvelope.games[0].gameId, bookmakerPreferredGame.gameId);
assert.equal(bookmakerPreferredEnvelope.games[0].team1.shortName, "Krasnodar");

console.log("Live envelope bookmaker-preferred source test passed");
