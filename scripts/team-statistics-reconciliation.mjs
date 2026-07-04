#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { ACTIVE_TEAMS } from '../src/config/teams.ts';
import { buildTeamStatisticsReconciliation } from '../lib/server/team-statistics-reconciliation.ts';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith('--')) args.set(process.argv[i], process.argv[i + 1]?.startsWith('--') ? true : (process.argv[i + 1] ?? true));
}
const base = String(args.get('--base-url') ?? 'https://ipbl-minimal-viewer.vercel.app').replace(/\/$/, '');
const season = Number(args.get('--season') ?? '2026');
const outPath = String(args.get('--out') ?? 'artifacts/team-statistics/team-statistics-reconciliation-latest.json');
const timeoutMs = Number(args.get('--timeout-ms') ?? '45000');
const retries = Number(args.get('--retries') ?? '2');

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchJsonOnce(url) {
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

async function fetchJson(url) {
  let last = null;
  const attempts = Math.max(1, retries + 1);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await fetchJsonOnce(url);
    last.attempt = attempt;
    if (last.ok) return last;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  return last;
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
    attempt: result.attempt ?? null,
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

const { summary } = buildTeamStatisticsReconciliation(teamResults, {
  base,
  season,
  timeoutMs,
  retries,
});

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify({ summary, teams: teamResults }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (summary.failures.length > 0 && args.get('--strict') === true) process.exit(2);
