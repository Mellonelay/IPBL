#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ACTIVE_TEAMS, TEAM_STATISTICS_DIVISIONS, teamsForDivision } from '../src/config/teams.ts';
import { LIVE_DIVISION_TAGS } from '../src/config/divisions.ts';
import { buildTeamProfile } from '../src/teams/statistics.ts';
import { buildTeamStatisticsRegistry, buildTeamStatisticsReconciliation } from '../lib/server/team-statistics-reconciliation.ts';

assert.equal(TEAM_STATISTICS_DIVISIONS.length, LIVE_DIVISION_TAGS.length);
assert.deepEqual(TEAM_STATISTICS_DIVISIONS.map((division) => division.tag), [...LIVE_DIVISION_TAGS]);
assert.equal(ACTIVE_TEAMS.length, TEAM_STATISTICS_DIVISIONS.reduce((sum, division) => sum + (division.tag === 'ipbl-66-m-pro-z' ? 2 : 4), 0));
assert.equal(new Set(ACTIVE_TEAMS.map((team) => team.teamId)).size, ACTIVE_TEAMS.length);
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

const liveRegistry = buildTeamStatisticsRegistry();
assert.equal(liveRegistry.divisionCount, 13);
assert.equal(liveRegistry.liveDivisionCount, 13);
assert.equal(liveRegistry.teamCount, 50);
assert.equal(liveRegistry.uniqueTeamCount, 50);

const reusableCoverage = {
  season: 2026,
  divisionTag: "ipbl-66-m-pro-a",
  loadedMonths: [1, 2, 3],
  currentOfficialOnline: { ok: true, itemCount: 1, error: null },
  recentOfficialCalendar: {
    ok: true,
    itemCount: 1,
    error: null,
    windows: [
      {
        from: "2026-06-01",
        to: "2026-06-02",
        ok: true,
        itemCount: 1,
        error: null,
      },
    ],
  },
};

const syntheticTeams = liveRegistry.divisions.flatMap((division, divisionIndex) =>
  Array.from({ length: division.expectedTeamCount }, (_, teamIndex) => {
    const teamId = divisionIndex * 10 + teamIndex + 1;
    return {
      teamId,
      name: `Team ${teamId}`,
      divisionTag: division.tag,
      url: `https://example.com/${division.tag}/${teamId}`,
      http: 200,
      ok: true,
      attempt: 1,
      error: null,
      source: 'official',
      coverage: { ...reusableCoverage, divisionTag: division.tag },
      totalCount: 1,
      completedCount: 1,
      quarterMatrixCount: 1,
      latest: {
        gameId: teamId,
        localDate: '01.06.2026',
        localTime: '10:00',
        score: '80 : 76',
        fullScore: '20:18,20:20,20:18,20:20',
        team1: `Team ${teamId}`,
        team2: `Opponent ${teamId}`,
      },
    };
  }),
);

const syntheticReconciliation = buildTeamStatisticsReconciliation(syntheticTeams, {
  base: 'https://example.com',
  season: 2026,
  timeoutMs: 1234,
  retries: 1,
  generatedAt: '2026-07-03T00:00:00.000Z',
  registry: liveRegistry,
});

assert.equal(syntheticReconciliation.summary.classification, 'RECONCILED');
assert.equal(syntheticReconciliation.summary.failures.length, 0);
assert.equal(syntheticReconciliation.summary.divisionSummary[0].okTeams, 4);

const malformedCoverageReconciliation = buildTeamStatisticsReconciliation([
  { ...syntheticTeams[0], coverage: null },
  ...syntheticTeams.slice(1),
], {
  base: 'https://example.com',
  season: 2026,
  timeoutMs: 1234,
  retries: 1,
  generatedAt: '2026-07-03T00:00:00.000Z',
  registry: liveRegistry,
});

assert.equal(malformedCoverageReconciliation.summary.classification, 'PARTIAL');
assert.ok(malformedCoverageReconciliation.summary.failures.some((failure) => failure.startsWith('coverage_missing:')));

const unavailableCoverageReconciliation = buildTeamStatisticsReconciliation([
  {
    ...syntheticTeams[0],
    coverage: {
      ...reusableCoverage,
      currentOfficialOnline: { ok: false, itemCount: 0, error: 'HTTP 503' },
      recentOfficialCalendar: {
        ok: false,
        itemCount: 0,
        error: 'HTTP 503',
        windows: reusableCoverage.recentOfficialCalendar.windows,
      },
    },
  },
  ...syntheticTeams.slice(1),
], {
  base: 'https://example.com',
  season: 2026,
  timeoutMs: 1234,
  retries: 1,
  generatedAt: '2026-07-03T00:00:00.000Z',
  registry: liveRegistry,
});

assert.equal(unavailableCoverageReconciliation.summary.classification, 'PARTIAL');
assert.ok(unavailableCoverageReconciliation.summary.failures.some((failure) => failure.startsWith('coverage_unavailable:')));

console.log('Team Statistics reconciliation tests passed');
