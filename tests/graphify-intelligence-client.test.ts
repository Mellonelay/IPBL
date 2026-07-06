import assert from "node:assert/strict";

import { requestGraphifyIntelligence } from "../lib/server/graphify-intelligence-client.ts";

const calls: Array<{ url: string; body: string | null }> = [];

const snapshot = await requestGraphifyIntelligence(
  {
    generatedAt: "2026-07-05T14:22:00.000Z",
    bettingRecord: {
      source: "public/bet_history_clean.json",
      generatedAt: "2026-07-05T14:22:00.000Z",
      totalBets: 1,
      period: { firstPlacedAt: null, lastPlacedAt: null },
      results: { wins: 1, losses: 0, other: 0, winRate: 100, totalStaked: 100, totalReturned: 150, netProfit: 50, roi: 50 },
      recentWindow: { size: 1, winRate: 100, totalStaked: 100, totalReturned: 150, netProfit: 50 },
      quarterStats: [],
      divisionStats: [],
      matchupStats: [],
      recentBets: [],
    },
    signals: [
      {
        gameId: 728563610,
        patternId: "q1-slow-q2-fast",
        description: "live signal",
        confidence: 0.91,
        evidence: ["quarter:1:first:14@2026-07-05T14:02:00.000Z"],
        suggestedBias: "OVER",
      },
    ],
  },
  async (url, init) => {
    calls.push({ url, body: typeof init?.body === "string" ? init.body : null });
    return new Response(JSON.stringify({
      packet: { layer: "graphify-betting-intelligence" },
      synthesis: { summary: "ok", fallback: false, nextAction: "replay" },
      storedAt: "2026-07-05T14:22:00.000Z",
    }), { status: 200, headers: { "content-type": "application/json" } });
  },
  { IPBL_GRAPHIFY_INTELLIGENCE_URL: "https://example.com/worker" } as NodeJS.ProcessEnv,
);

assert.equal(calls.length, 1);
assert.equal(calls[0]?.url, "https://example.com/worker");
assert.ok(calls[0]?.body);

const body = JSON.parse(calls[0]!.body!);
assert.equal(body.bettingRecord.totalBets, 1);
assert.equal(body.signals.length, 1);
assert.equal(body.signals[0].patternId, "q1-slow-q2-fast");
assert.equal(snapshot.synthesis.summary, "ok");
assert.equal(snapshot.synthesis.fallback, false);

console.log("graphify intelligence client tests passed");
