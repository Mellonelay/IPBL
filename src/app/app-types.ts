import type { BoxScoreState, GameReplay, H2HEntry, ScheduleGame } from "../api/types";
import type { OperatorDecision, QuarterFlowAnalysis, ScoreboardAnalysis } from "../operator/engine";

export type TabKey = "live" | "results" | "intelligence" | "teams" | "betting";

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
  replay: GameReplay | null;
  board: ScoreboardAnalysis;
  flow: QuarterFlowAnalysis | null;
  decision: OperatorDecision;
  h2h: H2HEntry[];
  histLoading: boolean;
  replayLoading: boolean;
  replayErr: string | null;
  detailErr: string | null;
};
