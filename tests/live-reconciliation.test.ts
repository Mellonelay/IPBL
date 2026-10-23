import assert from "node:assert/strict";
import { officialGameDetailIsTerminal, reconcileLiveGamesWithOfficialDetail } from "../lib/server/live-reconciliation.ts";
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


const staleDetail = {
  data: {
    status: "Ok",
    result: { game: { gameStatus: "Online", score1: 35, score2: 22, period: 1, score: "35:22" },
      status: { id: "Online", displayName: "Live" } },
  },
};
const newer = game({ score1: 60, score2: 42, scoreText: "60 : 42", period: 2 });
globalThis.fetch = async () => new Response(JSON.stringify(staleDetail), { status: 200, headers: { "content-type": "application/json" } });
try {
  const recovered = await reconcileLiveGamesWithOfficialDetail([newer]);
  assert.equal(recovered.games.length, 1);
  assert.equal(recovered.games[0].score1, 60, "older official score cannot roll back live score");
  assert.equal(recovered.games[0].score2, 42);
  assert.equal(recovered.games[0].period, 2);
  assert.equal(recovered.updated, 0);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Live reconciliation module tests passed");
