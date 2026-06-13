#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ACTIVE_TEAMS, TEAM_STATISTICS_DIVISIONS, teamsForDivision } from '../src/config/teams.ts';
import { LIVE_DIVISION_TAGS } from '../src/config/divisions.ts';
import { buildTeamProfile } from '../src/teams/statistics.ts';

assert.equal(TEAM_STATISTICS_DIVISIONS.length, 12);
assert.deepEqual(TEAM_STATISTICS_DIVISIONS.map((division) => division.tag), [...LIVE_DIVISION_TAGS]);
assert.equal(ACTIVE_TEAMS.length, 46);
assert.equal(new Set(ACTIVE_TEAMS.map((team) => team.teamId)).size, 46);
for (const division of TEAM_STATISTICS_DIVISIONS) {
  const expected = division.tag === 'ipbl-66-m-pro-z' ? 2 : 4;
  assert.equal(teamsForDivision(division.tag).length, expected, `${division.tag} team count`);
}
const rows = [
  { gameId: 1071077, scheduledTime: '2026-06-13T19:00:00+05:00', localDate: '13.06.2026', localTime: '19:00', status: 'ResultConfirmed', scoreText: '98 : 96', fullScore: '24:23,16:17,22:22,22:22,14:12', team1: { teamId: 76020, shortName: 'Novokuznetsk', name: 'Novokuznetsk' }, team2: { teamId: 76023, shortName: 'Izhevsk', name: 'Izhevsk' }, tag: 'ipbl-66-w-pro-a' },
  { gameId: 1071071, scheduledTime: '2026-06-12T19:00:00+05:00', localDate: '12.06.2026', localTime: '19:00', status: 'ResultConfirmed', scoreText: '105 : 99', fullScore: '32:25,23:24,27:24,23:26', team1: { teamId: 76020, shortName: 'Novokuznetsk', name: 'Novokuznetsk' }, team2: { teamId: 76023, shortName: 'Izhevsk', name: 'Izhevsk' }, tag: 'ipbl-66-w-pro-a' },
  { gameId: 1071065, scheduledTime: '2026-06-10T19:00:00+05:00', localDate: '10.06.2026', localTime: '19:00', status: 'ResultConfirmed', scoreText: '85 : 89', fullScore: '28:22,23:20,16:30,18:17', team1: { teamId: 76020, shortName: 'Novokuznetsk', name: 'Novokuznetsk' }, team2: { teamId: 76023, shortName: 'Izhevsk', name: 'Izhevsk' }, tag: 'ipbl-66-w-pro-a' },
];
const profile = buildTeamProfile(rows, 76023, 'all');
assert.equal(profile.totalAvailable, 3);
assert.deepEqual(profile.games.map((game) => game.localDate), ['13.06.2026', '12.06.2026', '10.06.2026']);
assert.equal(profile.wins, 1);
assert.equal(profile.losses, 2);
assert.equal(profile.quarterAverages[0] !== null, true);
assert.equal(profile.transitions.length, 3);
assert.equal(profile.transitions[0].samples, 3);
console.log('Team Statistics reconciliation tests passed');
