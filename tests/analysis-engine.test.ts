import assert from "node:assert/strict";
import fs from "node:fs";
import { ANALYSIS_ENGINE_ARTIFACT_PATH, buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.ts";

const artifact = JSON.parse(fs.readFileSync(ANALYSIS_ENGINE_ARTIFACT_PATH, "utf8")) as Record<string, unknown>;
const report = buildAnalysisEngineFromRepository();

assert.equal(report.schema, "ipbl.analysis-engine.v1");
assert.equal(report.status, "materialized");
assert.equal(report.readOnly, true);
assert.deepEqual(report.skills.map((skill) => skill.name), [
  "graphify-intent",
  "graphify-temporal",
  "code-review-graph",
]);
assert.ok(fs.existsSync(report.inputs.graphify.graphReport));
assert.ok(fs.existsSync(report.inputs.graphify.intelligenceRoadmap));
assert.ok(fs.existsSync(report.inputs.graphify.phaseRoadmap));
assert.ok(fs.existsSync(report.inputs.graphify.godNodeLedger));
assert.ok(fs.existsSync(report.inputs.c9.implementationScope));
assert.ok(fs.existsSync(report.inputs.c9.proofSummary));
assert.ok(fs.existsSync(report.inputs.c9.planManifest));
assert.ok(fs.existsSync(report.inputs.operatorIntelligence.artifact));
assert.ok(fs.existsSync(report.inputs.operatorIntelligence.refreshPlan));
assert.ok(fs.existsSync(report.inputs.codeReviewGraph.database));
assert.ok(fs.existsSync(report.inputs.codeReviewGraph.visualizationCatalog));
assert.deepEqual(report, artifact);
