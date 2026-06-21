import type { ScheduleGame } from "../server/calendar-normalize.js";
import type { PredictionInput, PredictionOutput } from "../prediction/prediction-engine.js";
import type { CalibrationResult } from "../calibration/confidence-calibrator.js";
import type { AdaptiveScore } from "../self-learning/adaptive-scorer.js";
import type { DriftReport } from "../calibration/prediction-drift.js";

export type PredictionLiveMatchup = {
  team1: string;
  team2: string;
};

export type PredictionLiveSnapshot = {
  score1: number;
  score2: number;
  scoreText: string;
  period: number | null;
  timeToGo: string | null;
  updatedAt: number | null;
  state: PredictionOutput["state"];
};

export type PredictionRuntimeRow = {
  gameId: number | string;
  tag: string;
  divisionLabel: string;
  matchup: PredictionLiveMatchup;
  live: PredictionLiveSnapshot;
  prediction: PredictionOutput;
  calibration: CalibrationResult;
  adaptive: AdaptiveScore;
  drift: DriftReport;
};

export function mapLiveGameToPredictionInput(game: ScheduleGame): PredictionInput {
  return {
    gameId: game.gameId,
    score1: game.score1,
    score2: game.score2,
    period: game.period ?? 0,
    timeToGo: game.timeToGo,
    previousOdds: null,
    currentOdds: null,
  };
}

export function mapPredictionRuntimeRow(
  game: ScheduleGame,
  prediction: PredictionOutput,
  calibration: CalibrationResult,
  adaptive: AdaptiveScore,
  drift: DriftReport,
): PredictionRuntimeRow {
  return {
    gameId: game.gameId,
    tag: game.tag,
    divisionLabel: game.divisionLabel,
    matchup: {
      team1: game.team1.shortName || game.team1.name,
      team2: game.team2.shortName || game.team2.name,
    },
    live: {
      score1: game.score1,
      score2: game.score2,
      scoreText: game.scoreText,
      period: game.period,
      timeToGo: game.timeToGo,
      updatedAt: game.updatedAt,
      state: prediction.state,
    },
    prediction,
    calibration,
    adaptive,
    drift,
  };
}
