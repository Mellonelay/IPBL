import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
assert.ok(report.inputs.graphify.graphReport.endsWith(path.join("graphify-out", "GRAPH_REPORT.md")));
assert.deepEqual(report, artifact);
