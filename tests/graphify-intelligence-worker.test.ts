import assert from "node:assert/strict";

import { buildGraphifyIntelligencePacket } from "../workers/graphify-intelligence/src/orchestrator.ts";
import { buildDeterministicSynthesis } from "../workers/graphify-intelligence/src/worker-ai.ts";

const packet = buildGraphifyIntelligencePacket({
  generatedAt: "2026-07-05T14:22:00.000Z",
  signals: [
    {
      gameId: 728563610,
      patternId: "q1-slow-q2-fast",
      description: "Q1 started slow and Q2 accelerated.",
      confidence: 0.92,
      evidence: ["quarter:1:first:15@2026-07-05T14:02:00.000Z"],
      suggestedBias: "OVER",
    },
  ],
  bettingRecord: {
    source: "public/bet_history_clean.json",
    generatedAt: "2026-07-05T14:22:00.000Z",
    totalBets: 300,
    period: {
      firstPlacedAt: "2026-03-11T23:21:39.000Z",
      lastPlacedAt: "2026-03-30T17:27:03.000Z",
    },
    results: {
      wins: 166,
      losses: 134,
      other: 0,
      winRate: 55.33,
      totalStaked: 1000000,
      totalReturned: 1150000,
      netProfit: 150000,
      roi: 15,
    },
    recentWindow: {
      size: 12,
      winRate: 58.33,
      totalStaked: 240000,
      totalReturned: 276000,
      netProfit: 36000,
    },
    quarterStats: [],
    divisionStats: [],
    matchupStats: [],
    recentBets: [],
  },
});

assert.equal(packet.layer, "graphify-betting-intelligence");
assert.deepEqual(packet.skills, ["graphify-intent", "graphify-temporal"]);
assert.equal(packet.skills.includes("code-review-graph" as never), false);
assert.ok(packet.bettingRecord);
assert.equal(packet.bettingRecord?.totalBets, 300);
assert.equal(packet.summary.signalCount, 1);
assert.equal(packet.summary.strongSignals, 1);
assert.equal(packet.summary.recommendedBias, "OVER");

const synthesis = buildDeterministicSynthesis(packet);
assert.equal(synthesis.fallback, true);
assert.match(synthesis.summary, /graphify betting intelligence/i);
assert.match(synthesis.summary, /betting record/i);
assert.equal(synthesis.nextAction, "replay");

console.log("graphify intelligence worker tests passed");
