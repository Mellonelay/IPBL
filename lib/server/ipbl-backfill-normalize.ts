import { createHash } from "node:crypto";
import type { ScheduleGame } from "./calendar-normalize.js";
import type { OfficialCalendarDayEvidence } from "./ingest-results-month.js";
import {
  classifyResultEvidence,
  dedupeFinishedGames,
  isFinishedResultGame,
  parsePeriodPairs,
} from "./results-hardening.js";
import type { BackfillSegmentCommit } from "./ipbl-supabase-worker.js";

const NORMALIZER_VERSION = "official-calendar-v1";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)])
  );
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function payloadSha256(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
function normalizeSourceDate(value: string | null | undefined): string | null {
  const input = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const dotted = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : null;
}

function normalizeSourceTime(value: string | null | undefined): string | null {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function sourceEventAt(game: ScheduleGame): string | null {
  if (game.scheduledTime && Number.isFinite(Date.parse(game.scheduledTime))) {
    return new Date(game.scheduledTime).toISOString();
  }
  const date = normalizeSourceDate(game.sourceLocalDate ?? game.localDate);
  const time = normalizeSourceTime(game.sourceLocalTime ?? game.localTime);
  if (!date || !time) return null;
  const value = `${date}T${time}+05:00`;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function sourceUpdatedAt(game: ScheduleGame): string | null {
  if (!Number.isFinite(game.updatedAt ?? NaN)) return null;
  const raw = Number(game.updatedAt);
  const millis = raw > 10_000_000_000 ? raw : raw * 1000;
  return Number.isFinite(new Date(millis).getTime()) ? new Date(millis).toISOString() : null;
}
function validIdentity(game: ScheduleGame): boolean {
  return Number.isInteger(game.team1.teamId)
    && game.team1.teamId > 0
    && Number.isInteger(game.team2.teamId)
    && game.team2.teamId > 0
    && game.team1.teamId !== game.team2.teamId;
}

function validScores(game: ScheduleGame): boolean {
  return Number.isInteger(game.score1)
    && game.score1 >= 0
    && Number.isInteger(game.score2)
    && game.score2 >= 0;
}

function sourceRecordId(raw: Record<string, unknown>, game: ScheduleGame | null): string | null {
  if (game?.gameId) return String(game.gameId);
  const rawGame = raw.game;
  if (rawGame && typeof rawGame === "object" && !Array.isArray(rawGame)) {
    const id = (rawGame as Record<string, unknown>).id;
    if (typeof id === "number" || typeof id === "string") return String(id);
  }
  return null;
}

function observationState(game: ScheduleGame | null): {
  state: "accepted" | "rejected" | "quarantined";
  code: string | null;
} {
  if (!game) return { state: "rejected", code: "unparseable_row" };
  if (!isFinishedResultGame(game)) return { state: "rejected", code: "non_finished_status" };
  if (!validIdentity(game)) return { state: "quarantined", code: "invalid_team_identity" };
  if (!validScores(game)) return { state: "quarantined", code: "invalid_final_score" };
  const evidence = classifyResultEvidence(game);
  if (evidence.quarterEvidenceQuarantined) {
    return { state: "quarantined", code: "period_total_conflict" };
  }
  return { state: "accepted", code: null };
}
export function buildBackfillSegmentCommit(
  evidence: OfficialCalendarDayEvidence
): BackfillSegmentCommit {
  const receivedAt = evidence.fetchedAt;
  const normalizedGames = evidence.rows.flatMap((row) => row.game ? [row.game] : []);
  const hardened = dedupeFinishedGames(normalizedGames);

  const observations = evidence.rows.map(({ raw, game }) => {
    const classification = observationState(game);
    const payload = {
      sourcePath: evidence.sourcePath,
      divisionTag: evidence.divisionTag,
      isoDate: evidence.isoDate,
      row: raw,
    };
    return {
      entity_kind: "result",
      source_record_id: sourceRecordId(raw, game),
      official_game_id: game?.gameId ?? null,
      source_event_at: game ? sourceEventAt(game) : null,
      source_updated_at: game ? sourceUpdatedAt(game) : null,
      received_at: receivedAt,
      payload,
      payload_sha256: payloadSha256(payload),
      parser_version: NORMALIZER_VERSION,
      acceptance_state: classification.state,
      rejection_code: classification.code,
    };
  });

  const accepted = hardened.games.filter(({ game }) => validIdentity(game) && validScores(game));
  const games = accepted.map(({ game }) => ({
    official_game_id: game.gameId,
    home_source_team_id: String(game.team1.teamId),
    away_source_team_id: String(game.team2.teamId),
    scheduled_at: sourceEventAt(game),
    source_local_date: normalizeSourceDate(game.sourceLocalDate ?? game.localDate) ?? evidence.isoDate,
    source_local_time: normalizeSourceTime(game.sourceLocalTime ?? game.localTime),
    status: game.status || game.upstreamStatusId || "ResultConfirmed",
    verification_state: "verified",
    home_score: game.score1,
    away_score: game.score2,
    full_score: game.fullScore,
    source_event_at: sourceEventAt(game),
    source_updated_at: sourceUpdatedAt(game),
    received_at: receivedAt,
    evidence_version: 1,
    normalizer_version: NORMALIZER_VERSION,
  }));

  const periods = accepted.flatMap(({ game, evidence: resultEvidence }) => {
    const eventAt = sourceEventAt(game);
    return parsePeriodPairs(game.fullScore).map(([homeScore, awayScore], index) => ({
      official_game_id: game.gameId,
      period_number: index + 1,
      period_type: index < 4 ? "quarter" : "overtime",
      home_score: homeScore,
      away_score: awayScore,
      evidence_complete: resultEvidence.periodState === "complete",
      source_event_at: eventAt,
      received_at: receivedAt,
    }));
  });

  return {
    observations,
    games,
    periods,
    metrics: {
      sourcePath: evidence.sourcePath,
      fetchedAt: evidence.fetchedAt,
      rawRows: evidence.rows.length,
      normalizedRows: normalizedGames.length,
      ...hardened.stats,
    },
  };
}
