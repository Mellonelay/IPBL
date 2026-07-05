import assert from "node:assert/strict";
import fs from "node:fs";

import { buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.ts";
import { buildGraphifyIntelligencePacket } from "../workers/graphify-intelligence/src/orchestrator.ts";

const analysisEngine = buildAnalysisEngineFromRepository();
const packet = buildGraphifyIntelligencePacket({
  generatedAt: "2026-07-05T14:22:00.000Z",
  signals: [],
});
const analysisSkills = analysisEngine.skills.map((skill) => skill.name);

assert.ok(analysisSkills.includes("graphify-intent"));
assert.ok(analysisSkills.includes("graphify-temporal"));
assert.ok(analysisSkills.includes("code-review-graph"));
assert.deepEqual(packet.skills, ["graphify-intent", "graphify-temporal"]);
assert.equal(packet.skills.includes("code-review-graph" as never), false);
assert.equal(packet.bettingRecord, null);

const analysisArtifact = JSON.parse(fs.readFileSync("graphify-out/.graphify_analysis.json", "utf8")) as Record<string, unknown>;
assert.ok("communities" in analysisArtifact);
assert.ok("cohesion" in analysisArtifact);
assert.ok("gods" in analysisArtifact);
assert.ok("surprises" in analysisArtifact);
assert.ok("questions" in analysisArtifact);

console.log("graphify contract tests passed");
