import assert from "node:assert/strict";

import { buildLiveQuarterPatterns } from "../lib/server/live-pattern-discovery.ts";
import type { GameReplay } from "../lib/server/replay-engine.ts";

const replay: GameReplay = {
  gameId: 728563610,
  gameKey: "ipbl-66-w-pro-b:728563610",
  timeline: [
    {
      kind: "quarter",
      capturedAt: "2026-07-05T14:02:00.000Z",
      quarter: 1,
      gameId: 728563610,
      score1: 7,
      score2: 8,
      scoreText: "7 : 8",
      fullScore: "7:8",
    },
    {
      kind: "odds",
      capturedAt: "2026-07-05T14:07:00.000Z",
      quarter: 1,
      gameId: 728563610,
      marketType: "over_under",
      line: 48.5,
      overOdds: 1.72,
      underOdds: 1.84,
      bookmaker: "melbet",
      marketStatus: "open",
    },
    {
      kind: "quarter",
      capturedAt: "2026-07-05T14:19:00.000Z",
      quarter: 1,
      gameId: 728563610,
      score1: 16,
      score2: 18,
      scoreText: "16 : 18",
      fullScore: "16:18",
    },
    {
      kind: "quarter",
      capturedAt: "2026-07-05T14:21:00.000Z",
      quarter: 2,
      gameId: 728563610,
      score1: 14,
      score2: 12,
      scoreText: "14 : 12",
      fullScore: "14:12",
    },
    {
      kind: "odds",
      capturedAt: "2026-07-05T14:23:00.000Z",
      quarter: 2,
      gameId: 728563610,
      marketType: "over_under",
      line: 50.5,
      overOdds: 1.66,
      underOdds: 2.02,
      bookmaker: "melbet",
      marketStatus: "open",
    },
    {
      kind: "quarter",
      capturedAt: "2026-07-05T14:27:00.000Z",
      quarter: 2,
      gameId: 728563610,
      score1: 20,
      score2: 20,
      scoreText: "20 : 20",
      fullScore: "20:20",
    },
  ],
};

const patterns = buildLiveQuarterPatterns(replay);

assert.deepEqual(patterns.map((pattern) => pattern.patternId), [
  "q1-slow-q2-fast",
  "q1-under-q2-over",
]);
assert.ok(patterns[0]?.confidence > patterns[1]?.confidence);
assert.equal(patterns[0]?.suggestedBias, "OVER");
assert.match(patterns[0]?.evidence.join(" ") ?? "", /quarter:1:first:15/);
assert.match(patterns[0]?.evidence.join(" ") ?? "", /quarter:2:last:40/);
assert.match(patterns[1]?.evidence.join(" ") ?? "", /odds:1:48.5/);

console.log("Live pattern discovery tests passed");
