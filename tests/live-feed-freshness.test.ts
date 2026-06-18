import assert from "node:assert/strict";
import { mergeLiveGamesByFreshness, officialGameDetailIsTerminal, reconcileLiveGamesWithOfficialDetail } from "../api/results/live.ts";
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
