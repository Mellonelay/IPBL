import assert from "node:assert/strict";
import { runMirrorProbe } from "../lib/server/bookmaker-mirror-health.ts";

const success = await runMirrorProbe({
  fetchBookmakerLive: async () => ({
    games: [
      {
        gameId: 1,
        tag: "ipbl-66-m-pro-a",
        scoreText: "10 : 8",
        team1: { shortName: "Omsk" },
        team2: { shortName: "Ukhta" },
      },
    ] as never,
    unmatched: [],
    receivedEvents: 1,
    sourceLeagues: [2496666, 2496667],
    sourceFailures: [],
  }),
});

assert.equal(success.ok, true);
assert.equal(success.games.length, 1);
assert.equal(success.games[0].team1, "Omsk");
assert.equal(success.sourceFailures.length, 0);

const failure = await runMirrorProbe({
  fetchBookmakerLive: async () => {
    const error = new Error("1xbet mirror down");
    (error as Error & { sourceFailures?: unknown[] }).sourceFailures = [
      { source: "1xbet", leagueId: 2496666, kind: "fetch_failed", error: "fetch failed" },
    ];
    throw error;
  },
});

assert.equal(failure.ok, false);
assert.equal(failure.error, "1xbet mirror down");
assert.equal(failure.sourceFailures.length, 1);
assert.equal(failure.sourceFailures[0].source, "1xbet");

console.log("Bookmaker mirror health probe tests passed");
