#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runPhaseC9RowReconciliation } from '../scripts/phase-c9-row-reconciliation.mjs';
import { createPhaseC9MockFetch } from './phase-c9-test-utils.mjs';

const out = 'artifacts/phase-c9/pr23/test-active-matched-gate.json';
const fetchImpl = await createPhaseC9MockFetch();
const run = await runPhaseC9RowReconciliation({ outPath: out, allowFallbackGameIds: true, fallbackGameIds: ['728878178'], fetchImpl });
assert.equal(run.summary.oddsDeploymentAllowed, false);
const payload = JSON.parse(fs.readFileSync(out, 'utf8'));
assert.equal(payload.summary.oddsImplementationGate.requiresActiveMatchedEventsstatProven, true);
assert.equal(payload.summary.oddsDeploymentAllowed, false);
assert.ok(Array.isArray(payload.summary.deterministicTeamPairEvidence));
for (const proof of payload.summary.activeMatchedEventsstatProofs ?? []) {
  assert.equal(proof.requiredForOddsGate ?? true, true);
  assert.ok(proof.productionGameId);
  assert.ok(proof.melbetGameId);
}
console.log('Phase C9 active matched EventsStat gate test passed');
