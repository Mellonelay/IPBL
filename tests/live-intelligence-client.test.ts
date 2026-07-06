import assert from "node:assert/strict";

import { normalizeLiveIntelligenceIndex, selectLiveSignal } from "../lib/runtime/live-intelligence-client.ts";

const index = normalizeLiveIntelligenceIndex({
  728563610: [
    {
      patternId: "q1-under-q2-over",
      description: "Quarter 1 under, quarter 2 over.",
      confidence: 0.84,
      evidence: ["quarter:1:first:15@2026-07-05T14:02:00.000Z"],
      suggestedBias: "MONITOR",
    },
    {
      patternId: "q1-slow-q2-fast",
      description: "Quarter 1 started slow and Quarter 2 accelerated.",
      confidence: 0.92,
      evidence: ["quarter:1:last:34@2026-07-05T14:19:00.000Z"],
      suggestedBias: "OVER",
    },
  ],
});

assert.equal(selectLiveSignal(index[728563610])?.patternId, "q1-slow-q2-fast");
assert.equal(selectLiveSignal(index[728563610])?.confidence, 0.92);
assert.deepEqual(Object.keys(index), ["728563610"]);

console.log("live intelligence client tests passed");
