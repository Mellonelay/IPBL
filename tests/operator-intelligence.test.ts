import assert from "node:assert/strict";
import fs from "node:fs";
import { buildOperatorIntelligenceReport, OPERATOR_INTELLIGENCE_ARTIFACT_PATH } from "../lib/server/operator-intelligence.ts";

const artifact = JSON.parse(fs.readFileSync(OPERATOR_INTELLIGENCE_ARTIFACT_PATH, "utf8")) as Record<string, unknown>;
const report = buildOperatorIntelligenceReport();

assert.equal(report.schema, "ipbl.operator-intelligence.v1");
assert.equal(report.phase, 12);
assert.equal(report.status, "seeded");
assert.equal(report.readOnly, true);
assert.equal(report.recommendations.enabled, false);
assert.equal(report.recommendations.mode, "evidence_only");
assert.equal(report.evidence.backtests.overall.profit_factor, 0.925451134284653);
assert.deepEqual(report.evidence.rules.safeQuarters, ["Q2", "Q4"]);
assert.deepEqual(report.evidence.rules.dangerousQuarters, ["Q1"]);
assert.equal(report.evidence.h2h.coverage, "repository-backed");
assert.equal(report.evidence.odds.coverage, "repository-backed");
assert.equal(report.evidence.recorder.coverage, "repository-backed");
assert.deepEqual(report, artifact);

console.log("Operator intelligence tests passed");
