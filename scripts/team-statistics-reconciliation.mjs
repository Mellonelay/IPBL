#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { ACTIVE_TEAMS, TEAM_STATISTICS_DIVISIONS, teamsForDivision } from '../src/config/teams.ts';
import { LIVE_DIVISION_TAGS } from '../src/config/divisions.ts';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith('--')) args.set(process.argv[i], process.argv[i + 1]?.startsWith('--') ? true : (process.argv[i + 1] ?? true));
}
const base = String(args.get('--base-url') ?? 'https://ipbl-minimal-viewer.vercel.app').replace(/\/$/, '');
const season = Number(args.get('--season') ?? '2026');
const outPath = String(args.get('--out') ?? 'artifacts/team-statistics/team-statistics-reconciliation-latest.json');
const timeoutMs = Number(args.get('--timeout-ms') ?? '30000');

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchJson(url) {
  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, { signal: t.signal, headers: { accept: 'application/json', 'cache-control': 'no-cache' } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, http: res.status, bytes: Buffer.byteLength(text), json, error: null };
  } catch (error) {
    return { ok: false, http: null, bytes: null, json: null, error: `${error.name}: ${error.message}` };
  } finally {
    t.done();
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index], index);
    }
  }));
  return out;
}

function scorePair(value) {
  const m = String(value ?? '').match(/(-?\d+)\s*[:\-]\s*(-?\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}
function quarterCount(fullScore) {
  return String(fullScore ?? '').split(/[,;|]/).map((p) => scorePair(p)).filter(Boolean).slice(0, 4).length;
}

const registry = {
  divisionCount: TEAM_STATISTICS_DIVISIONS.length,
  liveDivisionCount: LIVE_DIVISION_TAGS.length,
  teamCount: ACTIVE_TEAMS.length,
  uniqueTeamCount: new Set(ACTIVE_TEAMS.map((team) => team.teamId)).size,
  divisions: TEAM_STATISTICS_DIVISIONS.map((division) => ({
    tag: division.tag,
    label: division.label,
    expectedTeamCount: division.tag === 'ipbl-66-m-pro-z' ? 2 : 4,
    actualTeamCount: teamsForDivision(division.tag).length,
  })),
};

const teamResults = await mapLimit(ACTIVE_TEAMS, 6, async (team) => {
  const url = `${base}/api/teams/history?${new URLSearchParams({ teamId: String(team.teamId), tag: team.divisionTag, season: String(season), source: 'team-stats-reconciliation' })}`;
  const result = await fetchJson(url);
  const items = Array.isArray(result.json?.data?.items) ? result.json.data.items : [];
  const completed = items.filter((row) => scorePair(row?.game?.score));
  const withQuarterMatrix = completed.filter((row) => quarterCount(row?.game?.fullScore) >= 4);
  const latest = completed[0] ?? null;
  return {
    teamId: team.teamId,
    name: team.name,
    divisionTag: team.divisionTag,
    url,
    http: result.http,
    ok: result.ok,
    error: result.error ?? result.json?.error ?? null,
    source: result.json?.source ?? null,
    coverage: result.json?.coverage ?? null,
    totalCount: result.json?.data?.totalCount ?? null,
    completedCount: completed.length,
    quarterMatrixCount: withQuarterMatrix.length,
    latest: latest ? {
      gameId: latest.game?.id ?? null,
      localDate: latest.game?.localDate ?? null,
      localTime: latest.game?.localTime ?? null,
      score: latest.game?.score ?? null,
      fullScore: latest.game?.fullScore ?? null,
      team1: latest.team1?.name ?? null,
      team2: latest.team2?.name ?? null,
    } : null,
  };
});

const divisionSummary = registry.divisions.map((division) => {
  const teams = teamResults.filter((team) => team.divisionTag === division.tag);
  return {
    ...division,
    okTeams: teams.filter((team) => team.ok).length,
    teamsWithHistory: teams.filter((team) => Number(team.completedCount) > 0).length,
    teamsWithQuarterMatrix: teams.filter((team) => Number(team.quarterMatrixCount) > 0).length,
    sources: [...new Set(teams.map((team) => team.source).filter(Boolean))],
  };
});

const failures = [];
if (registry.divisionCount !== 12 || registry.liveDivisionCount !== 12) failures.push('division_count_not_12');
if (registry.teamCount !== 46 || registry.uniqueTeamCount !== 46) failures.push('team_count_not_46');
for (const division of divisionSummary) {
  if (division.actualTeamCount !== division.expectedTeamCount) failures.push(`team_count_mismatch:${division.tag}`);
  if (division.okTeams !== division.actualTeamCount) failures.push(`history_fetch_failure:${division.tag}`);
  if (division.teamsWithHistory === 0) failures.push(`no_history:${division.tag}`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  base,
  season,
  registry,
  divisionSummary,
  totals: {
    teamsChecked: teamResults.length,
    okTeams: teamResults.filter((team) => team.ok).length,
    teamsWithHistory: teamResults.filter((team) => Number(team.completedCount) > 0).length,
    teamsWithQuarterMatrix: teamResults.filter((team) => Number(team.quarterMatrixCount) > 0).length,
  },
  classification: failures.length === 0 ? 'RECONCILED' : 'PARTIAL',
  failures,
  policy: {
    oddsDeploymentAllowed: false,
    productionMutation: false,
    sourceModel: 'Results KV + official online + recent official daily calendar windows',
  },
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify({ summary, teams: teamResults }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0 && args.get('--strict') === true) process.exit(2);
