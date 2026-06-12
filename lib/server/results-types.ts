import type { ScheduleGame } from "./calendar-normalize.js";

export type ResultPeriodState = "complete" | "partial" | "missing" | "conflict";
export type ResultScoreIntegrity = "consistent" | "partial" | "unknown" | "conflict";

export type StoredResultEvidence = {
  periodCount: number;
  periodState: ResultPeriodState;
  scoreIntegrity: ResultScoreIntegrity;
  quarterEvidenceQuarantined: boolean;
};

export type StoredCalendarGridGame = {
  game: ScheduleGame;
  time: string;
  teams: string;
  score: string;
  division: string;
  divisionTag: string;
  quarterTotals: string | null;
  evidence?: StoredResultEvidence;
};

export type StoredCalendarGridDivision = {
  date: string;
  division: string;
  divisionTag: string;
  games: StoredCalendarGridGame[];
};

export type StoredResultsMonthMap = Record<string, StoredCalendarGridDivision[]>;

export type ResultsMonthMetadata = {
  schemaVersion: 1;
  status: "ok" | "source_unavailable" | "legacy";
  source: string;
  checkedAt: string;
  updatedAt: string | null;
  verifiedThroughDate: string | null;
  year: number;
  month: number;
  divisionTag: string;
  fetchedRows?: number;
  acceptedRows?: number;
  mergedRows?: number;
  preservedRows?: number;
  rejectedNonFinished?: number;
  duplicatesCollapsed?: number;
  partialPeriodRows?: number;
  quarantinedPeriodRows?: number;
  error?: string;
};

export type ResultsMonthEnvelope = {
  calendar: StoredResultsMonthMap;
  meta: ResultsMonthMetadata;
};
