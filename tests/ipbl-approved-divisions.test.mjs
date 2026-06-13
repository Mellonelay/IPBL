#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LIVE_DIVISION_TAGS, LIVE_DIVISIONS, DIVISIONS } from '../src/config/divisions.ts';
import { ACTIVE_TEAMS, teamsForDivision } from '../src/config/teams.ts';
import { RESULTS_SYNC_TAGS as CLIENT_RESULTS_SYNC_TAGS } from '../lib/results-constants.ts';
import { RESULTS_SYNC_TAGS as SERVER_RESULTS_SYNC_TAGS, canonicalDivisionLabel } from '../lib/server/results-sync-constants.ts';

const currentMen = ['ipbl-66-m-pro-a', 'ipbl-66-m-pro-b', 'ipbl-66-m-pro-c', 'ipbl-66-m-pro-d', 'ipbl-66-m-pro-u', 'ipbl-66-m-pro-z'];
const currentWomen = ['ipbl-66-w-pro-a', 'ipbl-66-w-pro-b', 'ipbl-66-w-pro-c', 'ipbl-66-w-pro-d', 'ipbl-66-w-pro-g', 'ipbl-66-w-pro-k'];
const current = [...currentMen, ...currentWomen];

assert.deepEqual([...LIVE_DIVISION_TAGS], current);
assert.equal(LIVE_DIVISIONS.length, 12);
assert.ok(DIVISIONS.some((division) => division.tag === 'ipbl-66-m-pro-z' && division.label === 'Pro Men Z'));
assert.ok(CLIENT_RESULTS_SYNC_TAGS.includes('ipbl-66-m-pro-z'));
assert.ok(SERVER_RESULTS_SYNC_TAGS.includes('ipbl-66-m-pro-z'));
assert.equal(canonicalDivisionLabel('ipbl-66-m-pro-z'), 'Pro Men Z');
assert.deepEqual(teamsForDivision('ipbl-66-m-pro-z').map((team) => team.name), ['Anapa', 'Magadan']);
assert.ok(ACTIVE_TEAMS.some((team) => team.teamId === 76055 && team.divisionTag === 'ipbl-66-m-pro-z'));
assert.ok(ACTIVE_TEAMS.some((team) => team.teamId === 76054 && team.divisionTag === 'ipbl-66-m-pro-z'));

for (const file of ['docs/divisions/IPBL_APPROVED_DIVISIONS.md', 'artifacts/divisions/ipbl-m-pro-z-migration-evidence.json', 'graphify-out/obsidian/IPBL Approved Division Registry.md']) {
  const text = fs.readFileSync(file, 'utf8');
  for (const tag of current) assert.ok(text.includes(tag), `${file} missing ${tag}`);
}
const evidence = JSON.parse(fs.readFileSync('artifacts/divisions/ipbl-m-pro-z-migration-evidence.json', 'utf8'));
assert.equal(evidence.totalApprovedDivisions, 12);
assert.equal(evidence.newApprovedDivision, 'ipbl-66-m-pro-z');
assert.equal(evidence.policy.approvedBoundaryUpdate, true);
assert.equal(evidence.policy.experimentalDivision, false);
console.log('IPBL approved division registry migration tests passed');
