import type { BoxScoreState, H2HEntry, ScheduleGame } from "../api/types";
import type { OperatorDecision, QuarterFlowAnalysis, ScoreboardAnalysis } from "../operator/engine";

export type TabKey = "live" | "results" | "intelligence" | "teams" | "betting";

export type H2HLoadState = "loading" | "loaded" | "partial" | "unavailable";

export type H2HStatus = {
  state: H2HLoadState;
  source: string | null;
  error: string | null;
};

export type LiveSourceFailure = {
  kind?: string;
  source?: string;
  leagueId?: number;
  error?: string;
};

export type LiveInsight = {
  game: ScheduleGame;
  board: ScoreboardAnalysis;
  flow: QuarterFlowAnalysis;
  decision: OperatorDecision;
  gameMeta: unknown | null;
  boxState: BoxScoreState | null;
};

export type DrawerState = {
  game: ScheduleGame;
  gameMeta: unknown | null;
  boxState: BoxScoreState | null;
  board: ScoreboardAnalysis;
  flow: QuarterFlowAnalysis | null;
  decision: OperatorDecision;
  h2h: H2HEntry[];
  h2hStatus: H2HStatus;
};

export type IntelligenceFocus = {
  game: ScheduleGame;
  h2h: H2HEntry[];
  h2hStatus: H2HStatus;
};
