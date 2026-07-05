import assert from "node:assert/strict";
import { loadIntelligenceSurface } from "../src/app/intelligence-client.ts";

const snapshot = await loadIntelligenceSurface(async (url) => {
  if (url.endsWith("/api/gen-analysis")) return new Response(JSON.stringify({ source: "api/gen-analysis" }));
  if (url.endsWith("/api/predictions/live")) return new Response(JSON.stringify({ summary: { rows: [] } }));
  if (url.endsWith("/api/recorder?mode=health")) return new Response(JSON.stringify({ health: "ok" }));
  if (url.endsWith("/api/analysis-engine")) return new Response(JSON.stringify({ schema: "ipbl.analysis-engine.v1" }));
  if (url.endsWith("/api/operator-intelligence")) return new Response(JSON.stringify({ schema: "ipbl.operator-intelligence.v1" }));
  throw new Error(`unexpected url ${url}`);
});

assert.equal(snapshot.analysisEngine.schema, "ipbl.analysis-engine.v1");
assert.equal(snapshot.operatorIntelligence.schema, "ipbl.operator-intelligence.v1");
