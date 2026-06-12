import type { ScheduleGame } from "./calendar-normalize.js";
import type {
  ResultsMonthMetadata,
  StoredCalendarGridGame,
  StoredResultEvidence,
  StoredResultsMonthMap,
} from "./results-types.js";

export type BuildHardeningStats = {
  fetchedRows: number;
  acceptedRows: number;
  rejectedNonFinished: number;
  duplicatesCollapsed: number;
  partialPeriodRows: number;
  quarantinedPeriodRows: number;
};

export type MergeHardeningStats = {
  mergedRows: number;
  addedRows: number;
  updatedRows: number;
  preservedRows: number;
};

export function parsePeriodPairs(fullScore: string | null | undefined): Array<[number, number]> {
  if (!fullScore) return [];
  const pairs: Array<[number, number]> = [];
  for (const raw of fullScore.split(",")) {
    const match = raw.trim().match(/^(-?\d+)\s*:\s*(-?\d+)$/);
    if (!match) continue;
    pairs.push([Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)]);
  }
  return pairs;
}

function finalScorePair(game: ScheduleGame): [number, number] | null {
  if (Number.isFinite(game.score1) && Number.isFinite(game.score2)) {
    return [game.score1, game.score2];
  }
  const match = String(game.scoreText ?? "").match(/(\d+)\s*:\s*(\d+)/);
  return match ? [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)] : null;
}

export function classifyResultEvidence(game: ScheduleGame): StoredResultEvidence {
  const pairs = parsePeriodPairs(game.fullScore);
  if (pairs.length === 0) {
    return {
      periodCount: 0,
      periodState: "missing",
      scoreIntegrity: "unknown",
      quarterEvidenceQuarantined: false,
    };
  }

  if (pairs.length < 4) {
    return {
      periodCount: pairs.length,
      periodState: "partial",
      scoreIntegrity: "partial",
      quarterEvidenceQuarantined: false,
    };
  }

  const total: [number, number] = pairs.reduce(
    (acc, [left, right]) => [acc[0] + left, acc[1] + right],
    [0, 0] as [number, number]
  );
  const final = finalScorePair(game);
  if (final && (final[0] !== total[0] || final[1] !== total[1])) {
    return {
      periodCount: pairs.length,
      periodState: "conflict",
      scoreIntegrity: "conflict",
      quarterEvidenceQuarantined: true,
    };
  }

  return {
    periodCount: pairs.length,
    periodState: "complete",
    scoreIntegrity: "consistent",
    quarterEvidenceQuarantined: false,
  };
}

export function isFinishedResultGame(game: ScheduleGame): boolean {
  if (!Number.isFinite(game.gameId) || game.gameId <= 0 || game.isLive) return false;
  const status = [game.status, game.statusDisplay, game.upstreamStatusId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/cancel|scheduled|not started|online|live|progress|in play|отмен|не нач/i.test(status)) return false;
  return /result|finish|completed|complete|final|confirmed|заверш|итог|окончен/i.test(status);
}

export function sanitizeFinishedGame(game: ScheduleGame): { game: ScheduleGame; evidence: StoredResultEvidence } {
  const evidence = classifyResultEvidence(game);
  if (!evidence.quarterEvidenceQuarantined) return { game: { ...game }, evidence };
  return {
    game: { ...game, fullScore: null },
    evidence,
  };
}

function evidenceRank(evidence: StoredResultEvidence): number {
  switch (evidence.scoreIntegrity) {
    case "consistent": return 40 + evidence.periodCount;
    case "partial": return 30 + evidence.periodCount;
    case "unknown": return 20;
    case "conflict": return 10;
  }
}

function evidenceForRow(row: StoredCalendarGridGame): StoredResultEvidence {
  return row.evidence ?? classifyResultEvidence(row.game);
}

export function preferStoredRow(
  existing: StoredCalendarGridGame,
  incoming: StoredCalendarGridGame
): StoredCalendarGridGame {
  const existingEvidence = evidenceForRow(existing);
  const incomingEvidence = evidenceForRow(incoming);
  const existingRank = evidenceRank(existingEvidence);
  const incomingRank = evidenceRank(incomingEvidence);
  if (incomingRank > existingRank) return incoming;
  if (incomingRank < existingRank) return existing;
  const existingUpdated = existing.game.updatedAt ?? 0;
  const incomingUpdated = incoming.game.updatedAt ?? 0;
  return incomingUpdated >= existingUpdated ? incoming : existing;
}

export function dedupeFinishedGames(games: ScheduleGame[]): {
  games: Array<{ game: ScheduleGame; evidence: StoredResultEvidence }>;
  stats: BuildHardeningStats;
} {
  const byId = new Map<number, { game: ScheduleGame; evidence: StoredResultEvidence }>();
  const stats: BuildHardeningStats = {
    fetchedRows: games.length,
    acceptedRows: 0,
    rejectedNonFinished: 0,
    duplicatesCollapsed: 0,
    partialPeriodRows: 0,
    quarantinedPeriodRows: 0,
  };

  for (const raw of games) {
    if (!isFinishedResultGame(raw)) {
      stats.rejectedNonFinished += 1;
      continue;
    }
    const candidate = sanitizeFinishedGame(raw);
    if (candidate.evidence.periodState === "partial") stats.partialPeriodRows += 1;
    if (candidate.evidence.quarterEvidenceQuarantined) stats.quarantinedPeriodRows += 1;
    const previous = byId.get(raw.gameId);
    if (!previous) {
      byId.set(raw.gameId, candidate);
      continue;
    }
    stats.duplicatesCollapsed += 1;
    const preferred = preferStoredRow(
      { game: previous.game } as StoredCalendarGridGame,
      { game: candidate.game } as StoredCalendarGridGame
    );
    byId.set(raw.gameId, preferred.game === candidate.game ? candidate : previous);
  }

  const accepted = [...byId.values()];
  stats.acceptedRows = accepted.length;
  return { games: accepted, stats };
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isTeamRef(value: unknown): boolean {
  return isRecord(value)
    && typeof value.teamId === "number"
    && Number.isFinite(value.teamId)
    && typeof value.shortName === "string"
    && typeof value.name === "string";
}

function isScheduleGame(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.gameId === "number"
    && Number.isFinite(value.gameId)
    && typeof value.tag === "string"
    && typeof value.status === "string"
    && typeof value.statusDisplay === "string"
    && isNullableString(value.upstreamStatusId)
    && typeof value.score1 === "number"
    && Number.isFinite(value.score1)
    && typeof value.score2 === "number"
    && Number.isFinite(value.score2)
    && typeof value.scoreText === "string"
    && isNullableString(value.fullScore)
    && typeof value.localDate === "string"
    && typeof value.localTime === "string"
    && typeof value.divisionLabel === "string"
    && isNullableFiniteNumber(value.period)
    && isNullableString(value.timeToGo)
    && isNullableFiniteNumber(value.timeIsGo)
    && typeof value.isLive === "boolean"
    && isNullableFiniteNumber(value.updatedAt)
    && (value.scheduledTime === undefined || isNullableString(value.scheduledTime))
    && (value.sourceLocalDate === undefined || isNullableString(value.sourceLocalDate))
    && (value.sourceLocalTime === undefined || isNullableString(value.sourceLocalTime))
    && (value.sourceTimeZone === undefined || isNullableString(value.sourceTimeZone))
    && (value.displayTimeZone === undefined || isNullableString(value.displayTimeZone))
    && isTeamRef(value.team1)
    && isTeamRef(value.team2);
}

function isStoredResultEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.periodCount === "number"
    && Number.isInteger(value.periodCount)
    && value.periodCount >= 0
    && ["complete", "partial", "missing", "conflict"].includes(String(value.periodState))
    && ["consistent", "partial", "unknown", "conflict"].includes(String(value.scoreIntegrity))
    && typeof value.quarterEvidenceQuarantined === "boolean";
}

function isStoredCalendarGridGame(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isScheduleGame(value.game)
    && typeof value.time === "string"
    && typeof value.teams === "string"
    && typeof value.score === "string"
    && typeof value.division === "string"
    && typeof value.divisionTag === "string"
    && isNullableString(value.quarterTotals)
    && (value.evidence === undefined || isStoredResultEvidence(value.evidence));
}

function isStoredCalendarGridDivision(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.games)) return false;
  return typeof value.date === "string"
    && typeof value.division === "string"
    && typeof value.divisionTag === "string"
    && value.games.every(isStoredCalendarGridGame);
}

export function parseResultsMetadata(value: unknown): ResultsMonthMetadata | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(parsed)) return null;
    if (parsed.schemaVersion !== 1) return null;
    if (!["ok", "source_unavailable", "legacy"].includes(String(parsed.status))) return null;
    if (typeof parsed.source !== "string" || !parsed.source.trim()) return null;
    if (typeof parsed.checkedAt !== "string" || !parsed.checkedAt.trim()) return null;
    if (!isNullableString(parsed.updatedAt) || !isNullableString(parsed.verifiedThroughDate)) return null;
    if (typeof parsed.year !== "number" || !Number.isInteger(parsed.year)) return null;
    if (typeof parsed.month !== "number" || !Number.isInteger(parsed.month) || parsed.month < 1 || parsed.month > 12) return null;
    if (typeof parsed.divisionTag !== "string" || !parsed.divisionTag.trim()) return null;
    for (const field of [
      "fetchedRows", "acceptedRows", "mergedRows", "preservedRows", "rejectedNonFinished",
      "duplicatesCollapsed", "partialPeriodRows", "quarantinedPeriodRows",
    ]) {
      const candidate = parsed[field];
      if (candidate !== undefined && (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < 0)) return null;
    }
    if (parsed.error !== undefined && typeof parsed.error !== "string") return null;
    return parsed as ResultsMonthMetadata;
  } catch {
    return null;
  }
}

export function parseStoredResultsMonth(value: unknown): StoredResultsMonthMap | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(parsed)) return null;
    for (const [day, groups] of Object.entries(parsed)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(groups)) return null;
      if (!groups.every(isStoredCalendarGridDivision)) return null;
    }
    return parsed as StoredResultsMonthMap;
  } catch {
    return null;
  }
}

function cloneMap(map: StoredResultsMonthMap): StoredResultsMonthMap {
  return JSON.parse(JSON.stringify(map)) as StoredResultsMonthMap;
}

export function mergeStoredResultsMonths(
  existing: StoredResultsMonthMap | null,
  incoming: StoredResultsMonthMap
): { map: StoredResultsMonthMap; stats: MergeHardeningStats } {
  if (!existing) {
    const rows = Object.values(incoming).flatMap((groups) => groups.flatMap((group) => group.games));
    return {
      map: cloneMap(incoming),
      stats: { mergedRows: rows.length, addedRows: rows.length, updatedRows: 0, preservedRows: 0 },
    };
  }

  const allDays = [...new Set([...Object.keys(existing), ...Object.keys(incoming)])].sort();
  const template = (day: string) => incoming[day]?.[0] ?? existing[day]?.[0];
  const chosen = new Map<number, { day: string; row: StoredCalendarGridGame; origin: "existing" | "incoming" }>();

  for (const [day, groups] of Object.entries(existing)) {
    for (const group of groups ?? []) {
      for (const row of group.games ?? []) {
        if (!Number.isFinite(row.game?.gameId) || !isFinishedResultGame(row.game)) continue;
        const sanitized = sanitizeFinishedGame(row.game);
        const hardenedRow: StoredCalendarGridGame = {
          ...row,
          game: sanitized.game,
          quarterTotals: sanitized.evidence.quarterEvidenceQuarantined ? null : row.quarterTotals,
          evidence: sanitized.evidence,
        };
        const previous = chosen.get(row.game.gameId);
        if (!previous) {
          chosen.set(row.game.gameId, { day, row: hardenedRow, origin: "existing" });
          continue;
        }
        const preferred = preferStoredRow(previous.row, hardenedRow);
        if (preferred === hardenedRow) chosen.set(row.game.gameId, { day, row: hardenedRow, origin: "existing" });
      }
    }
  }

  let addedRows = 0;
  let updatedRows = 0;
  let preservedRows = 0;
  for (const [day, groups] of Object.entries(incoming)) {
    for (const group of groups ?? []) {
      for (const row of group.games ?? []) {
        const gameId = row.game?.gameId;
        if (!Number.isFinite(gameId)) continue;
        const previous = chosen.get(gameId);
        if (!previous) {
          chosen.set(gameId, { day, row, origin: "incoming" });
          addedRows += 1;
          continue;
        }
        const preferred = preferStoredRow(previous.row, row);
        if (preferred === row) {
          chosen.set(gameId, { day, row, origin: "incoming" });
          updatedRows += 1;
        } else {
          preservedRows += 1;
        }
      }
    }
  }

  const out: StoredResultsMonthMap = {};
  for (const day of allDays) {
    const base = template(day);
    if (!base) continue;
    out[day] = [{ ...base, games: [] }];
  }
  for (const { day, row } of chosen.values()) {
    if (!out[day]?.[0]) {
      const base = template(day);
      if (!base) continue;
      out[day] = [{ ...base, games: [] }];
    }
    out[day][0].games.push(row);
  }
  for (const groups of Object.values(out)) {
    for (const group of groups) group.games.sort((a, b) => a.time.localeCompare(b.time));
  }

  return {
    map: out,
    stats: { mergedRows: chosen.size, addedRows, updatedRows, preservedRows },
  };
}

export function latestPopulatedDate(map: StoredResultsMonthMap): string | null {
  const populated = Object.entries(map)
    .filter(([, groups]) => groups.some((group) => (group.games?.length ?? 0) > 0))
    .map(([date]) => date)
    .sort();
  return populated.at(-1) ?? null;
}

export function verifiedThroughDateForMonth(year: number, month: number, now = new Date()): string | null {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Yangon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value])
  );
  const currentYear = Number(parts.year);
  const currentMonth = Number(parts.month);
  const currentDay = Number(parts.day);
  if (year > currentYear || (year === currentYear && month > currentMonth)) return null;
  const day = year === currentYear && month === currentMonth
    ? currentDay
    : new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function legacyResultsMetadata(args: {
  map: StoredResultsMonthMap;
  year: number;
  month: number;
  divisionTag: string;
}): ResultsMonthMetadata {
  return {
    schemaVersion: 1,
    status: "legacy",
    source: "results-kv",
    checkedAt: new Date(0).toISOString(),
    updatedAt: null,
    verifiedThroughDate: latestPopulatedDate(args.map),
    year: args.year,
    month: args.month,
    divisionTag: args.divisionTag,
  };
}
