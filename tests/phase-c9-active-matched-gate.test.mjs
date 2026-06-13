#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const out = 'artifacts/phase-c9/pr23/test-active-matched-gate.json';
const run = spawnSync(process.execPath, ['scripts/phase-c9-row-reconciliation.mjs', '--out', out, '--allow-fallback-game-ids', '--fallback-game-ids', '728878178'], { encoding: 'utf8' });
assert.equal(run.status, 0, run.stderr || run.stdout);
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
