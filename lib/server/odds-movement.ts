export type OddsRedis = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: Record<string, unknown>): Promise<unknown>;
  lpush(key: string, value: unknown): Promise<unknown>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export type OddsMovementSnapshot = {
  gameId: number;
  quarter: number | null;
  marketType: "over_under";
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  bookmaker: string;
  marketStatus: string;
  capturedAt: string;
};

export type OddsMovementInput = Omit<OddsMovementSnapshot, "capturedAt"> & {
  capturedAt: string | number | Date;
};

export type OddsTimelineEvent = Record<string, unknown> & {
  capturedAt: string;
  kind: string;
  quarter: number | null;
};

const ODDS_PREFIX = "ipbl:odds:v1";
const ODDS_TTL_SECONDS = 30 * 24 * 60 * 60;
const ODDS_RETENTION = 1440;

function text(value: unknown): string {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fingerprint(snapshot: OddsMovementSnapshot): string {
  return JSON.stringify([
    snapshot.gameId,
    snapshot.quarter,
    snapshot.marketType,
    snapshot.line,
    snapshot.overOdds,
    snapshot.underOdds,
    snapshot.bookmaker,
    snapshot.marketStatus,
  ]);
}

export function oddsHistoryKey(gameId: number): string {
  return `${ODDS_PREFIX}:game:${gameId}:timeline`;
}

function oddsLatestKey(gameId: number): string {
  return `${ODDS_PREFIX}:game:${gameId}:latest`;
}

export function normalizeOddsSnapshot(input: OddsMovementInput): OddsMovementSnapshot {
  return {
    gameId: input.gameId,
    quarter: input.quarter,
    marketType: input.marketType,
    line: input.line,
    overOdds: input.overOdds,
    underOdds: input.underOdds,
    bookmaker: input.bookmaker,
    marketStatus: input.marketStatus,
    capturedAt: text(input.capturedAt),
  };
}

export async function recordOddsSnapshot(redis: OddsRedis, input: OddsMovementInput): Promise<{ recorded: boolean; snapshot: OddsMovementSnapshot }> {
  const snapshot = normalizeOddsSnapshot(input);
  const latestRaw = await redis.get<OddsMovementSnapshot | string>(oddsLatestKey(snapshot.gameId));
  const latest = typeof latestRaw === "string"
    ? (() => {
      try { return JSON.parse(latestRaw) as OddsMovementSnapshot; } catch { return null; }
    })()
    : latestRaw;
  if (latest && fingerprint(latest) === fingerprint(snapshot)) {
    return { recorded: false, snapshot };
  }

  const timelineKey = oddsHistoryKey(snapshot.gameId);
  await redis.lpush(timelineKey, JSON.stringify(snapshot));
  await redis.ltrim(timelineKey, 0, ODDS_RETENTION - 1);
  await redis.expire(timelineKey, ODDS_TTL_SECONDS);
  await redis.set(oddsLatestKey(snapshot.gameId), JSON.stringify(snapshot), { ex: ODDS_TTL_SECONDS });
  return { recorded: true, snapshot };
}

function time(value: unknown): number {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mergeQuarterAndOddsTimeline<T extends OddsTimelineEvent, U extends OddsTimelineEvent>(
  quarterTimeline: T[],
  oddsTimeline: U[],
): Array<T | U> {
  const quarterRows = quarterTimeline.map((entry) => ({ ...entry, kind: entry.kind || "quarter" }));
  const oddsRows = oddsTimeline.map((entry) => ({ ...entry, kind: entry.kind || "odds" }));
  return [...quarterRows, ...oddsRows]
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const delta = time(left.entry.capturedAt) - time(right.entry.capturedAt);
      if (delta !== 0) return delta;
      const kindRank = (value: string) => (value === "quarter" ? 0 : 1);
      const kindDelta = kindRank(left.entry.kind) - kindRank(right.entry.kind);
      if (kindDelta !== 0) return kindDelta;
      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}

export function parseOddsLine(value: unknown): number | null {
  return finiteNumber(value);
}
