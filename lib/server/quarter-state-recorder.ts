import type { RecordedLiveSnapshot } from "./live-recorder.js";

export type QuarterStateInput = {
  gameId: number;
  division: string;
  teams: readonly [string, string];
  quarter: number;
  timeRemaining: string | null;
  score: string;
  source: string;
};

export type QuarterStateSnapshot = QuarterStateInput;

function isFinitePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value) && value > 0;
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeTeams(value: unknown): readonly [string, string] {
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError("quarter-state snapshot requires exactly two teams");
  const [team1, team2] = value;
  if (!isNonEmptyText(team1) || !isNonEmptyText(team2)) throw new TypeError("quarter-state snapshot requires non-empty teams");
  return [team1, team2] as const;
}

function normalizeTimeRemaining(value: unknown): string | null {
  if (value === null) return null;
  if (!isNonEmptyText(value)) throw new TypeError("quarter-state snapshot requires timeRemaining text");
  return value;
}

function normalizeQuarter(value: unknown): number {
  if (!isFinitePositiveInteger(value)) throw new TypeError("quarter-state snapshot requires a positive quarter");
  return value;
}

function normalizeSnapshot(input: Partial<QuarterStateInput>): QuarterStateSnapshot {
  if (!isFinitePositiveInteger(input.gameId)) throw new TypeError("quarter-state snapshot requires a valid gameId");
  if (!isNonEmptyText(input.division)) throw new TypeError("quarter-state snapshot requires a division");
  if (!isNonEmptyText(input.score)) throw new TypeError("quarter-state snapshot requires a score");
  if (!isNonEmptyText(input.source)) throw new TypeError("quarter-state snapshot requires a source");
  return {
    gameId: input.gameId,
    division: input.division.trim(),
    teams: normalizeTeams(input.teams),
    quarter: normalizeQuarter(input.quarter),
    timeRemaining: normalizeTimeRemaining(input.timeRemaining),
    score: input.score.trim(),
    source: input.source.trim(),
  };
}

function fromLiveSnapshot(snapshot: RecordedLiveSnapshot): QuarterStateInput {
  return {
    gameId: snapshot.gameId,
    division: snapshot.division,
    teams: [snapshot.team1.name, snapshot.team2.name],
    quarter: snapshot.quarter ?? 0,
    timeRemaining: snapshot.timeRemaining,
    score: snapshot.score,
    source: snapshot.source,
  };
}

export function buildQuarterStateSnapshot(input: QuarterStateInput | RecordedLiveSnapshot): QuarterStateSnapshot {
  const row = "team1" in input && "team2" in input ? fromLiveSnapshot(input) : input;
  return normalizeSnapshot(row);
}

export function normalizeQuarterStateSnapshot(snapshot: unknown): QuarterStateSnapshot {
  if (!snapshot || typeof snapshot !== "object") throw new TypeError("quarter-state snapshot requires an object");
  const row = snapshot as Partial<QuarterStateInput>;
  return normalizeSnapshot({
    gameId: row.gameId,
    division: row.division,
    teams: row.teams,
    quarter: row.quarter,
    timeRemaining: row.timeRemaining,
    score: row.score,
    source: row.source,
  });
}
