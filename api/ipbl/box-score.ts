import type { VercelRequest, VercelResponse } from '@vercel/node';

type UpstreamStatus = 'OK' | 'FAIL';

type BoxScorePeriod = {
  period: number;
  label: string;
  home: number | null;
  away: number | null;
};

const SPORT_SHORT_URL = 'https://1xlite-041469.top/service-api/LiveFeed/GetSportsShortZip?sports=3,40&champs=2496666&lng=en&gr=830&country=126&virtualSports=true&groupChamps=true';

function getSingleQuery(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function walkObjects(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((item) => walkObjects(item, out));
    return out;
  }
  const obj = value as Record<string, unknown>;
  out.push(obj);
  Object.values(obj).forEach((item) => walkObjects(item, out));
  return out;
}

function findGame(raw: unknown, id: string): Record<string, unknown> | null {
  for (const obj of walkObjects(raw)) {
    const objId = toStringValue(obj.I) ?? toStringValue(obj.Id) ?? toStringValue(obj.id) ?? toStringValue(obj.gameId);
    const home = toStringValue(obj.O1) ?? toStringValue(obj.homeTeam);
    const away = toStringValue(obj.O2) ?? toStringValue(obj.awayTeam);
    if (objId === id && home && away) return obj;
  }
  return null;
}

function makeBoxScore(game: Record<string, unknown>, gameId: string) {
  const sc = (game.SC && typeof game.SC === 'object' ? game.SC : {}) as Record<string, unknown>;
  const fs = (sc.FS && typeof sc.FS === 'object' ? sc.FS : {}) as Record<string, unknown>;
  const periods = Array.isArray(sc.PS) ? sc.PS : [];
  const periodScores: BoxScorePeriod[] = periods.map((period) => {
    const rec = (period && typeof period === 'object' ? period : {}) as Record<string, unknown>;
    const val = (rec.Value && typeof rec.Value === 'object' ? rec.Value : {}) as Record<string, unknown>;
    const n = toNumber(rec.Key) ?? 0;
    return { period: n, label: n ? `Q${n}` : 'Period', home: toNumber(val.S1), away: toNumber(val.S2) };
  }).filter((q) => q.period > 0);

  return {
    gameId,
    source: '1xlite:GetSportsShortZip',
    homeTeam: toStringValue(game.O1) ?? toStringValue(game.O1E),
    awayTeam: toStringValue(game.O2) ?? toStringValue(game.O2E),
    total: { home: toNumber(fs.S1), away: toNumber(fs.S2) },
    currentPeriod: toStringValue(sc.CP) ?? toStringValue(sc.CPS),
    clock: toStringValue(sc.SLS) ?? toStringValue(sc.TS),
    periods: periodScores,
  };
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: string; json: unknown | null }> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mellonelay-IPBL-BoxScore/1.0',
    },
  });
  const body = await response.text();
  let json: unknown | null = null;
  try {
    json = JSON.parse(body);
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, body, json };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  const id = getSingleQuery(req.query.id);
  if (!id) {
    return res.status(400).json({
      status: { status: 'FAIL' as UpstreamStatus, errorCode: 'MISSING_ID', lastSyncAt: new Date().toISOString(), latencyMs: Date.now() - started },
      boxScore: null,
    });
  }

  try {
    const upstream = await fetchJson(SPORT_SHORT_URL);
    if (!upstream.ok || !upstream.json) {
      return res.status(200).json({
        status: { status: 'FAIL' as UpstreamStatus, errorCode: 'SOURCE_UNAVAILABLE', httpStatus: upstream.status, lastSyncAt: new Date().toISOString(), latencyMs: Date.now() - started },
        boxScore: null,
      });
    }
    const match = findGame(upstream.json, id);
    if (!match) {
      return res.status(200).json({
        status: { status: 'FAIL' as UpstreamStatus, errorCode: 'GAME_NOT_FOUND', source: '1xlite:GetSportsShortZip', lastSyncAt: new Date().toISOString(), latencyMs: Date.now() - started },
        boxScore: null,
      });
    }
    return res.status(200).json({
      status: { status: 'OK' as UpstreamStatus, source: '1xlite:GetSportsShortZip', lastSyncAt: new Date().toISOString(), latencyMs: Date.now() - started },
      boxScore: makeBoxScore(match, id),
      raw: match,
    });
  } catch (error) {
    return res.status(200).json({
      status: { status: 'FAIL' as UpstreamStatus, errorCode: 'SOURCE_UNAVAILABLE', message: String(error instanceof Error ? error.message : error).slice(0, 240), lastSyncAt: new Date().toISOString(), latencyMs: Date.now() - started },
      boxScore: null,
    });
  }
}
