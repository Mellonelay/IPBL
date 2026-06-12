import type { ScheduleGame } from "./calendar-normalize.js";

export const RECORDER_SCHEMA_VERSION = 1 as const;
export const RECORDER_RETENTION = 1440;
export const RECORDER_TTL_SECONDS = 30 * 24 * 60 * 60;
export const RECORDER_PREFIX = "ipbl:recorder:v1";

export const APPROVED_LIVE_TAGS = [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d", "ipbl-66-m-pro-u",
  "ipbl-66-w-pro-a", "ipbl-66-w-pro-b", "ipbl-66-w-pro-c", "ipbl-66-w-pro-d", "ipbl-66-w-pro-g", "ipbl-66-w-pro-k",
] as const;

const APPROVED_TAG_SET = new Set<string>(APPROVED_LIVE_TAGS);

export type LiveSourceStatus = {
  lastSyncAt?: string;
  status?: string;
  source?: string;
  fallbackFrom?: string;
  requestedDivisions?: number;
  successfulDivisions?: number;
  failures?: unknown[];
  bookmakerSourceLeagues?: number[];
  bookmakerSourceFailures?: unknown[];
  receivedBookmakerEvents?: number;
  unmatchedBookmakerEvents?: unknown[];
  latencyMs?: number;
  displayTimeZone?: string;
  [key: string]: unknown;
};

export type LiveFeedEnvelope = { games: ScheduleGame[]; status: LiveSourceStatus };
export type QuarterScore = { period: number; team1: number; team2: number };

export type SnapshotTransition = {
  previousCapturedAt: string | null;
  scoreDelta1: number | null;
  scoreDelta2: number | null;
  scoreChanged: boolean;
  periodChanged: boolean;
  clockDeltaSeconds: number | null;
  clockAnomaly: boolean;
  sourceChanged: boolean;
};

export type RecordedLiveSnapshot = {
  schemaVersion: typeof RECORDER_SCHEMA_VERSION;
  capturedAt: string;
  capturedAtMs: number;
  gameKey: string;
  gameId: number;
  divisionTag: string;
  divisionLabel: string;
  team1: ScheduleGame["team1"];
  team2: ScheduleGame["team2"];
  score1: number;
  score2: number;
  scoreText: string;
  fullScore: string | null;
  quarterScores: QuarterScore[];
  period: number | null;
  timeToGo: string | null;
  timeIsGo: number | null;
  status: string;
  statusDisplay: string;
  isLive: boolean;
  scheduledTime: string | null;
  localDate: string;
  localTime: string;
  displayTimeZone: string | null;
  source: string;
  fallbackFrom: string | null;
  sourceStatus: string | null;
  sourceUpdatedAt: string | null;
  transition: SnapshotTransition;
};

export type RecorderRun = {
  schemaVersion: typeof RECORDER_SCHEMA_VERSION;
  capturedAt: string;
  source: string;
  sourceStatus: string | null;
  receivedGames: number;
  acceptedGames: number;
  recordedSnapshots: number;
  duplicateSnapshots: number;
  rejectedGames: Array<{ gameId: number | null; tag: string | null; reason: string }>;
  missingPreviouslyActive: string[];
  activeGameKeys: string[];
};

export interface RecorderRedis {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: Record<string, unknown>): Promise<unknown>;
  lpush(key: string, value: unknown): Promise<unknown>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]>;
  sadd(key: string, ...members: string[]): Promise<unknown>;
  srem(key: string, ...members: string[]): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export const recorderKeys = {
  active: `${RECORDER_PREFIX}:active`,
  runs: `${RECORDER_PREFIX}:runs`,
  status: `${RECORDER_PREFIX}:status`,
  gameTimeline: (gameKey: string) => `${RECORDER_PREFIX}:game:${gameKey}:timeline`,
  gameLatest: (gameKey: string) => `${RECORDER_PREFIX}:game:${gameKey}:latest`,
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clockSeconds(clock: string | null): number | null {
  if (!clock) return null;
  const match = clock.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}

export function parseQuarterScores(fullScore: string | null): QuarterScore[] {
  if (!fullScore) return [];
  const rows: QuarterScore[] = [];
  for (const [index, part] of fullScore.split(",").entries()) {
    const match = part.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match) continue;
    rows.push({ period: index + 1, team1: Number.parseInt(match[1], 10), team2: Number.parseInt(match[2], 10) });
  }
  return rows;
}

export function validateLiveGame(game: unknown): { ok: true; game: ScheduleGame } | { ok: false; gameId: number | null; tag: string | null; reason: string } {
  if (!game || typeof game !== "object") return { ok: false, gameId: null, tag: null, reason: "not-an-object" };
  const row = game as Partial<ScheduleGame>;
  const gameId = finiteNumber(row.gameId);
  const tag = text(row.tag) || null;
  if (gameId === null || gameId <= 0) return { ok: false, gameId, tag, reason: "invalid-game-id" };
  if (!tag || !APPROVED_TAG_SET.has(tag)) return { ok: false, gameId, tag, reason: "unapproved-division" };
  if (!row.isLive) return { ok: false, gameId, tag, reason: "not-live" };
  if (!row.team1 || !row.team2 || finiteNumber(row.team1.teamId) === null || finiteNumber(row.team2.teamId) === null || row.team1.teamId <= 0 || row.team2.teamId <= 0) {
    return { ok: false, gameId, tag, reason: "invalid-team-id" };
  }
  if (finiteNumber(row.score1) === null || finiteNumber(row.score2) === null) return { ok: false, gameId, tag, reason: "invalid-score" };
  return { ok: true, game: row as ScheduleGame };
}

export function snapshotFingerprint(snapshot: RecordedLiveSnapshot): string {
  return JSON.stringify([
    snapshot.score1, snapshot.score2, snapshot.fullScore, snapshot.period, snapshot.timeToGo,
    snapshot.timeIsGo, snapshot.status, snapshot.isLive, snapshot.source,
  ]);
}

export function buildSnapshot(game: ScheduleGame, sourceStatus: LiveSourceStatus, capturedAtMs: number, previous: RecordedLiveSnapshot | null): RecordedLiveSnapshot {
  const capturedAt = new Date(capturedAtMs).toISOString();
  const source = text(sourceStatus.source) || "unknown";
  const previousClock = previous ? clockSeconds(previous.timeToGo) : null;
  const currentClock = clockSeconds(game.timeToGo);
  const samePeriod = previous !== null && previous.period === game.period;
  const clockDeltaSeconds = samePeriod && previousClock !== null && currentClock !== null ? previousClock - currentClock : null;
  return {
    schemaVersion: RECORDER_SCHEMA_VERSION,
    capturedAt,
    capturedAtMs,
    gameKey: `${game.tag}:${game.gameId}`,
    gameId: game.gameId,
    divisionTag: game.tag,
    divisionLabel: game.divisionLabel,
    team1: game.team1,
    team2: game.team2,
    score1: game.score1,
    score2: game.score2,
    scoreText: game.scoreText,
    fullScore: game.fullScore,
    quarterScores: parseQuarterScores(game.fullScore),
    period: game.period,
    timeToGo: game.timeToGo,
    timeIsGo: game.timeIsGo,
    status: game.status,
    statusDisplay: game.statusDisplay,
    isLive: game.isLive,
    scheduledTime: game.scheduledTime ?? null,
    localDate: game.localDate,
    localTime: game.localTime,
    displayTimeZone: game.displayTimeZone ?? null,
    source,
    fallbackFrom: text(sourceStatus.fallbackFrom) || null,
    sourceStatus: text(sourceStatus.status) || null,
    sourceUpdatedAt: text(sourceStatus.lastSyncAt) || (game.updatedAt ? new Date(game.updatedAt).toISOString() : null),
    transition: {
      previousCapturedAt: previous?.capturedAt ?? null,
      scoreDelta1: previous ? game.score1 - previous.score1 : null,
      scoreDelta2: previous ? game.score2 - previous.score2 : null,
      scoreChanged: previous ? game.score1 !== previous.score1 || game.score2 !== previous.score2 : false,
      periodChanged: previous ? game.period !== previous.period : false,
      clockDeltaSeconds,
      clockAnomaly: clockDeltaSeconds !== null && clockDeltaSeconds < -5,
      sourceChanged: previous ? source !== previous.source : false,
    },
  };
}

async function readLatest(redis: RecorderRedis, gameKey: string): Promise<RecordedLiveSnapshot | null> {
  const value = await redis.get<RecordedLiveSnapshot | string>(recorderKeys.gameLatest(gameKey));
  if (!value) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as RecordedLiveSnapshot; } catch { return null; }
  }
  return value;
}

export async function recordLiveEnvelope(redis: RecorderRedis, envelope: LiveFeedEnvelope, capturedAtMs = Date.now()): Promise<RecorderRun> {
  const games = Array.isArray(envelope?.games) ? envelope.games : [];
  const sourceStatus = envelope?.status && typeof envelope.status === "object" ? envelope.status : {};
  const rejectedGames: RecorderRun["rejectedGames"] = [];
  const activeGameKeys: string[] = [];
  let recordedSnapshots = 0;
  let duplicateSnapshots = 0;

  for (const candidate of games) {
    const validation = validateLiveGame(candidate);
    if (!validation.ok) {
      rejectedGames.push({ gameId: validation.gameId, tag: validation.tag, reason: validation.reason });
      continue;
    }
    const game = validation.game;
    const gameKey = `${game.tag}:${game.gameId}`;
    activeGameKeys.push(gameKey);
    const previous = await readLatest(redis, gameKey);
    const snapshot = buildSnapshot(game, sourceStatus, capturedAtMs, previous);
    if (previous && snapshotFingerprint(previous) === snapshotFingerprint(snapshot)) {
      duplicateSnapshots += 1;
    } else {
      const timelineKey = recorderKeys.gameTimeline(gameKey);
      await redis.lpush(timelineKey, JSON.stringify(snapshot));
      await redis.ltrim(timelineKey, 0, RECORDER_RETENTION - 1);
      await redis.expire(timelineKey, RECORDER_TTL_SECONDS);
      await redis.set(recorderKeys.gameLatest(gameKey), JSON.stringify(snapshot), { ex: RECORDER_TTL_SECONDS });
      recordedSnapshots += 1;
    }
  }

  const previousActive = await redis.smembers(recorderKeys.active);
  const activeSet = new Set(activeGameKeys);
  const sourceFailed = text(sourceStatus.status).toUpperCase() === "FAIL";
  const missingPreviouslyActive = sourceFailed ? [] : previousActive.filter((key) => !activeSet.has(key));
  if (!sourceFailed && missingPreviouslyActive.length > 0) await redis.srem(recorderKeys.active, ...missingPreviouslyActive);
  if (!sourceFailed && activeGameKeys.length > 0) await redis.sadd(recorderKeys.active, ...activeGameKeys);

  const run: RecorderRun = {
    schemaVersion: RECORDER_SCHEMA_VERSION,
    capturedAt: new Date(capturedAtMs).toISOString(),
    source: text(sourceStatus.source) || "unknown",
    sourceStatus: text(sourceStatus.status) || null,
    receivedGames: games.length,
    acceptedGames: activeGameKeys.length,
    recordedSnapshots,
    duplicateSnapshots,
    rejectedGames,
    missingPreviouslyActive,
    activeGameKeys,
  };
  await redis.lpush(recorderKeys.runs, JSON.stringify(run));
  await redis.ltrim(recorderKeys.runs, 0, RECORDER_RETENTION - 1);
  await redis.set(recorderKeys.status, JSON.stringify({ ...run, sourceDetails: sourceStatus }));
  return run;
}

export function isAuthorizedCronRequest(authorization: string | undefined, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  return authorization === `Bearer ${secret}`;
}
