import type { VercelRequest, VercelResponse } from '@vercel/node';

type LiveGame = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  currentPeriod: string | null;
  status: 'live';
  division?: string;
  divisionTag?: string;
  raw?: unknown;
};

const SOURCE_URL = 'https://1xlite-041469.top/service-api/LiveFeed/GetSportsShortZip?sports=3,40&champs=2496666&lng=en&gr=830&country=126&virtualSports=true&groupChamps=true';

function pickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

function pickNumber(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function pickScore(item: any, side: 'home' | 'away'): number | null {
  const directKeys = side === 'home'
    ? ['SC1', 'S1', 'homeScore', 'score1', 'Score1']
    : ['SC2', 'S2', 'awayScore', 'score2', 'Score2'];
  const direct = pickNumber(item, directKeys);
  if (direct !== null) return direct;
  const fullScore = item?.SC?.FS;
  const nested = side === 'home' ? fullScore?.S1 : fullScore?.S2;
  if (typeof nested === 'number' && Number.isFinite(nested)) return nested;
  if (typeof nested === 'string' && nested.trim() !== '' && Number.isFinite(Number(nested))) return Number(nested);
  return null;
}

function pickCurrentPeriod(item: any): string | null {
  return pickString(item, ['P', 'Period', 'currentPeriod', 'period'])
    ?? pickString(item?.SC, ['CP', 'CPS', 'S', 'TS'])
    ?? null;
}

function walk(value: any, out: any[] = []): any[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out);
    return out;
  }
  const id = pickString(value, ['I', 'Id', 'id', 'gameId', 'GameId', 'CI']);
  const home = pickString(value, ['O1', 'Home', 'home', 'homeTeam', 'Team1', 'T1', 'Name1']);
  const away = pickString(value, ['O2', 'Away', 'away', 'awayTeam', 'Team2', 'T2', 'Name2']);
  const s1 = pickScore(value, 'home');
  const s2 = pickScore(value, 'away');
  if (id && home && away && (s1 !== null || s2 !== null)) out.push(value);
  for (const child of Object.values(value)) walk(child, out);
  return out;
}

function normalize(raw: any): LiveGame[] {
  const root = raw?.Value ?? raw?.value ?? raw?.data ?? raw;
  const candidates = walk(root);
  const games: LiveGame[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const gameId = pickString(item, ['I', 'Id', 'id', 'gameId', 'GameId', 'CI']);
    const homeTeam = pickString(item, ['O1', 'Home', 'home', 'homeTeam', 'Team1', 'T1', 'Name1']);
    const awayTeam = pickString(item, ['O2', 'Away', 'away', 'awayTeam', 'Team2', 'T2', 'Name2']);
    if (!gameId || !homeTeam || !awayTeam || seen.has(gameId)) continue;
    seen.add(gameId);
    games.push({
      gameId,
      homeTeam,
      awayTeam,
      homeScore: pickScore(item, 'home'),
      awayScore: pickScore(item, 'away'),
      currentPeriod: pickCurrentPeriod(item),
      status: 'live',
      division: pickString(item, ['L', 'League', 'Champ', 'champName']) ?? 'IPBL Pro Division',
      divisionTag: 'ipbl-1xlite-live',
      raw: item,
    });
  }
  return games;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        'user-agent': 'Mellonelay-IPBL/1.0',
      },
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(200).json({
        games: [],
        status: { lastSyncAt: new Date().toISOString(), status: 'FAIL', errorCode: 'SOURCE_UNAVAILABLE', httpStatus: upstream.status, latencyMs: Date.now() - started },
      });
    }
    let json: any;
    try { json = JSON.parse(text); }
    catch {
      return res.status(200).json({
        games: [],
        status: { lastSyncAt: new Date().toISOString(), status: 'FAIL', errorCode: 'PARSER_ERROR', latencyMs: Date.now() - started },
      });
    }
    const games = normalize(json);
    if (!games.length) {
      return res.status(200).json({
        games: [],
        status: { lastSyncAt: new Date().toISOString(), status: 'FAIL', errorCode: 'EMPTY', upstreamSuccess: json?.Success ?? null, latencyMs: Date.now() - started },
      });
    }
    return res.status(200).json({
      games,
      status: { lastSyncAt: new Date().toISOString(), status: 'OK', source: '1xlite:GetSportsShortZip', latencyMs: Date.now() - started },
    });
  } catch (err: any) {
    return res.status(200).json({
      games: [],
      status: { lastSyncAt: new Date().toISOString(), status: 'FAIL', errorCode: 'SOURCE_UNAVAILABLE', message: String(err?.message || err).slice(0, 200), latencyMs: Date.now() - started },
    });
  }
}
