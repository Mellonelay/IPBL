export function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

export function normalizeCalendarRow(row) {
  assertObject(row, 'IPBL calendar row');
  assertObject(row.game, 'IPBL row.game');
  const g = row.game;
  const required = ['id', 'score1', 'score2', 'score', 'localDate'];
  const missing = required.filter((key) => g[key] === undefined || g[key] === null || g[key] === '');
  if (missing.length) {
    throw new Error(`IPBL calendar row missing required score fields: ${missing.join(',')}`);
  }
  const score1 = Number(g.score1);
  const score2 = Number(g.score2);
  if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
    throw new Error('IPBL score fields must be numeric');
  }
  return {
    gameId: Number(g.id),
    divisionTag: getPath(row, 'league.tag') ?? null,
    divisionName: getPath(row, 'league.name') ?? null,
    date: String(g.localDate),
    time: g.localTime == null ? null : String(g.localTime),
    team1: getPath(row, 'team1.name') ?? getPath(row, 'team1.shortName') ?? null,
    team2: getPath(row, 'team2.name') ?? getPath(row, 'team2.shortName') ?? null,
    score1,
    score2,
    score: String(g.score),
    fullScore: g.fullScore == null ? null : String(g.fullScore),
    status: g.gameStatus ?? null,
    statusDisplay: getPath(row, 'status.displayName') ?? null,
    gameNumber: g.number ?? null,
    arena: getPath(row, 'arena.name') ?? null,
    region: getPath(row, 'region.name') ?? null,
    source: 'api1.ipbl.pro'
  };
}

export function normalizeCalendarPayload(payload) {
  const items = payload?.data?.items || payload?.items;
  if (!Array.isArray(items)) {
    throw new Error('IPBL calendar payload missing items array');
  }
  return items.filter((row) => row?.game?.showScore && row?.game?.score).map(normalizeCalendarRow);
}
