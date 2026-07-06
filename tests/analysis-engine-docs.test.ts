import assert from "node:assert/strict";
import fs from "node:fs";

const roadmap = fs.readFileSync("docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md", "utf8");
const index = fs.readFileSync("docs/PHASE_MASTER_INDEX.md", "utf8");
const checklist = fs.readFileSync("docs/PHASE_MASTER_CHECKLIST.md", "utf8");
const ledger = fs.readFileSync("docs/PHASE_FINAL_MASTER_LEDGER.md", "utf8");
const closure = fs.readFileSync("docs/PHASE_CLOSURE_CURRENT_STATE.md", "utf8");
const phaseRoadmap = fs.readFileSync("artifacts/graphify/phase-roadmap.json", "utf8");
const godLedger = fs.readFileSync("artifacts/graphify/god-node-ledger.json", "utf8");

for (const text of [roadmap, index, checklist, ledger, closure, phaseRoadmap, godLedger]) {
  assert.match(text, /artifacts\/analysis-engine\/ipbl-analysis-engine\.json/);
}

assert.match(roadmap, /graphify-intent/);
assert.match(roadmap, /graphify-temporal/);
assert.match(roadmap, /code-review-graph/);

console.log("Analysis engine docs tests passed");
