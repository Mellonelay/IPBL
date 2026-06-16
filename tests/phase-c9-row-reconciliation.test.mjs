import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPhaseC9RowReconciliation } from '../scripts/phase-c9-row-reconciliation.mjs';

const out = path.join(os.tmpdir(), `c9-row-reconciliation-${Date.now()}.json`);
const result = await runPhaseC9RowReconciliation({ outPath: out });
assert.equal(result.summary.oddsDeploymentAllowed, false);
const data = JSON.parse(fs.readFileSync(out, 'utf8'));
assert.equal(data.summary.oddsDeploymentAllowed, false);
assert.ok(data.summary.endpoints.productionLive);
assert.ok(data.summary.rowCounts);
assert.ok(Array.isArray(data.eventsstat));
assert.ok(data.summary.eventsstatProbeMode);
console.log('Phase C9 row reconciliation smoke test passed');
