#!/usr/bin/env node
import assert from 'node:assert/strict';
import { LIVE_DIVISION_TAGS } from '../src/config/divisions.ts';
import { resolveResultsQuery } from '../api/results.ts';
import { resolveTeamHistoryQuery } from '../api/teams/history.ts';
import { resolveTeamSelectionFromParams } from '../src/components/team-selection.ts';

const now = new Date('2026-06-14T05:00:00Z');

const exactResults = resolveResultsQuery({ division: 'ipbl-66-m-pro-a', meta: '1' }, now);
assert.equal(exactResults.ok, true);
assert.equal(exactResults.year, 2026);
assert.equal(exactResults.month, 6);
assert.equal(exactResults.divisionTag, 'ipbl-66-m-pro-a');
assert.equal(exactResults.wantsMetadata, true);
assert.equal(exactResults.defaultedYearMonth, true);

const tagAlias = resolveResultsQuery({ tag: 'ipbl-66-m-pro-a', meta: '1' }, now);
assert.equal(tagAlias.ok, true);
assert.equal(tagAlias.usedTagAlias, true);

for (const tag of LIVE_DIVISION_TAGS) {
  const resolved = resolveResultsQuery({ division: tag, meta: '1' }, now);
  assert.equal(resolved.ok, true, `${tag} should resolve for current month metadata query`);
}

const exactTeamHistory = resolveTeamHistoryQuery(new URLSearchParams('teamId=76038&tag=ipbl-66-m-pro-a&range=30'), now);
assert.equal(exactTeamHistory.ok, true);
assert.equal(exactTeamHistory.teamId, 76038);
assert.equal(exactTeamHistory.tag, 'ipbl-66-m-pro-a');
assert.equal(exactTeamHistory.season, 2026);
assert.equal(exactTeamHistory.range, 30);
assert.equal(exactTeamHistory.defaultedSeason, true);

const womenTeamHistory = resolveTeamHistoryQuery(new URLSearchParams('teamId=76016&tag=ipbl-66-w-pro-k&range=30'), now);
assert.equal(womenTeamHistory.ok, true);
assert.equal(womenTeamHistory.tag, 'ipbl-66-w-pro-k');

const badRange = resolveTeamHistoryQuery(new URLSearchParams('teamId=76038&tag=ipbl-66-m-pro-a&range=999'), now);
assert.equal(badRange.ok, false);
assert.equal(badRange.error, 'Invalid range');


const menSelection = resolveTeamSelectionFromParams(new URLSearchParams('tab=teams&division=ipbl-66-m-pro-a&team=76038&range=30'));
assert.deepEqual(menSelection, { divisionTag: 'ipbl-66-m-pro-a', teamId: 76038, range: 30 });

const womenSelection = resolveTeamSelectionFromParams(new URLSearchParams('tab=teams&division=ipbl-66-w-pro-k&team=76016&range=30'));
assert.deepEqual(womenSelection, { divisionTag: 'ipbl-66-w-pro-k', teamId: 76016, range: 30 });

const invalidCrossGenderTeam = resolveTeamSelectionFromParams(new URLSearchParams('tab=teams&division=ipbl-66-m-pro-a&team=76016&range=30'));
assert.equal(invalidCrossGenderTeam.divisionTag, 'ipbl-66-m-pro-a');
assert.equal(invalidCrossGenderTeam.teamId, 76038, 'women team id must not remain selected under men Pro A');

console.log('Frontend/API query contract regressions passed');
