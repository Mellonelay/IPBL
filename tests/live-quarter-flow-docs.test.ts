import assert from "node:assert/strict";
import fs from "node:fs";

const roadmap = fs.readFileSync("docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md", "utf8");
const quarterFlow = fs.readFileSync("docs/LIVE_QUARTER_FLOW_INTELLIGENCE.md", "utf8");
const upgradeAudit = fs.readFileSync("docs/GRAPHIFY_UPGRADE_AUDIT.md", "utf8");
const masterIndex = fs.readFileSync("docs/PHASE_MASTER_INDEX.md", "utf8");
const backendChecklist = fs.readFileSync("docs/BACKEND_RESPONSIBILITIES_CHECKLIST.md", "utf8");

assert.match(roadmap, /Live Betting Intelligence Orchestration/i);
assert.match(roadmap, /graphify-intent/i);
assert.match(roadmap, /graphify-temporal/i);
assert.match(roadmap, /workers\/graphify-intelligence\/src\/orchestrator\.ts/i);
assert.match(quarterFlow, /q1-slow-q2-fast/i);
assert.match(quarterFlow, /q1-under-q2-over/i);
assert.match(quarterFlow, /code-review-graph/i);
assert.match(upgradeAudit, /communities/);
assert.match(upgradeAudit, /cohesion/);
assert.match(upgradeAudit, /gods/);
assert.match(masterIndex, /Live Betting Intelligence Orchestration/);
assert.match(masterIndex, /tests\/graphify-intelligence-worker\.test\.ts/);
assert.match(backendChecklist, /Live Betting Intelligence/);
assert.match(backendChecklist, /Worker AI/);

console.log("live quarter-flow docs tests passed");
