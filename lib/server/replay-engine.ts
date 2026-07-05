import { recorderKeys, type RecordedLiveSnapshot, type RecorderRedis } from "./live-recorder.js";
import { oddsHistoryKey, type OddsMovementSnapshot, type OddsRedis } from "./odds-movement.js";

export type ReplayEvent =
  | (Record<string, unknown> & {
    kind: "quarter";
    capturedAt: string;
    quarter: number | null;
  })
  | (Record<string, unknown> & {
    kind: "odds";
    capturedAt: string;
    quarter: number | null;
  })
  | (Record<string, unknown> & {
    kind: "result";
    capturedAt: string;
    quarter: number | null;
  });

export type GameReplay = {
  gameId: number;
  gameKey: string;
  timeline: ReplayEvent[];
};

type ReplayRedis = RecorderRedis & OddsRedis;

function parseRow<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value as T;
}

function time(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function kindRank(kind: ReplayEvent["kind"]): number {
  if (kind === "quarter") return 0;
  if (kind === "odds") return 1;
  return 2;
}

function replaySort(a: ReplayEvent, b: ReplayEvent): number {
  const delta = time(a.capturedAt) - time(b.capturedAt);
  if (delta !== 0) return delta;
  const kindDelta = kindRank(a.kind) - kindRank(b.kind);
  if (kindDelta !== 0) return kindDelta;
  return Number(a.quarter ?? 0) - Number(b.quarter ?? 0);
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function totalFromScoreText(scoreText: unknown): number | null {
  if (typeof scoreText !== "string") return null;
  const match = scoreText.match(/(\d+)\s*[:\-]\s*(\d+)(?:\s*,\s*(\d+)\s*[:\-]\s*(\d+))?/);
  if (!match) return null;
  const left = Number.parseInt(match[1], 10);
  const right = Number.parseInt(match[2], 10);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return left + right;
}

export function replayEventTotal(event: ReplayEvent): number | null {
  const score1 = numeric((event as Record<string, unknown>).score1);
  const score2 = numeric((event as Record<string, unknown>).score2);
  if (score1 !== null && score2 !== null) return score1 + score2;
  return totalFromScoreText((event as Record<string, unknown>).scoreText);
}

function resultFromQuarter(snapshot: RecordedLiveSnapshot): ReplayEvent {
  return {
    kind: "result",
    capturedAt: snapshot.capturedAt,
    quarter: snapshot.quarter,
    gameId: snapshot.gameId,
    score1: snapshot.score1,
    score2: snapshot.score2,
    scoreText: snapshot.scoreText,
    fullScore: snapshot.fullScore,
    divisionTag: snapshot.divisionTag,
    divisionLabel: snapshot.divisionLabel,
  };
}

export async function buildGameReplay(redis: ReplayRedis, gameId: number): Promise<GameReplay> {
  const gameKey = await redis.get<string>(recorderKeys.gameById(gameId));
  if (!gameKey) {
    return { gameId, gameKey: "", timeline: [] };
  }

  const [quarterRows, oddsRows] = await Promise.all([
    redis.lrange<string | Record<string, unknown>>(recorderKeys.gameTimeline(gameKey), 0, 1439),
    redis.lrange<string | Record<string, unknown>>(oddsHistoryKey(gameId), 0, 1439),
  ]);

  let latestQuarterSnapshot: RecordedLiveSnapshot | null = null;
  const quarterSnapshots: ReplayEvent[] = quarterRows.flatMap((row) => {
    const snapshot = parseRow<RecordedLiveSnapshot>(row);
    if (!snapshot) return [];
    if (!latestQuarterSnapshot) latestQuarterSnapshot = snapshot;
    return [{
      kind: "quarter" as const,
      capturedAt: snapshot.capturedAt,
      quarter: snapshot.quarter,
      gameId: snapshot.gameId,
      score1: snapshot.score1,
      score2: snapshot.score2,
      scoreText: snapshot.scoreText,
      fullScore: snapshot.fullScore,
      divisionTag: snapshot.divisionTag,
      divisionLabel: snapshot.divisionLabel,
    }];
  });

  const oddsSnapshots: ReplayEvent[] = oddsRows.flatMap((row) => {
    const snapshot = parseRow<OddsMovementSnapshot>(row);
    if (!snapshot) return [];
    return [{
      kind: "odds" as const,
      capturedAt: snapshot.capturedAt,
      quarter: snapshot.quarter,
      gameId: snapshot.gameId,
      marketType: snapshot.marketType,
      line: snapshot.line,
      overOdds: snapshot.overOdds,
      underOdds: snapshot.underOdds,
      bookmaker: snapshot.bookmaker,
      marketStatus: snapshot.marketStatus,
    }];
  });

  const timeline = [...quarterSnapshots, ...oddsSnapshots];
  if (latestQuarterSnapshot) timeline.push(resultFromQuarter(latestQuarterSnapshot));

  return {
    gameId,
    gameKey,
    timeline: timeline.sort(replaySort),
  };
}
