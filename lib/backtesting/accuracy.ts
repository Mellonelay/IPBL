import type { PredictionOutput } from "../prediction/prediction-engine";
import type { MatchOutcome } from "./outcome-resolver";

export interface AccuracyResult {
  gameId: string | number;
  predicted: MatchOutcome;
  actual: MatchOutcome;
  correct: boolean;
  score: number;
}

export function computeAccuracy(prediction: PredictionOutput, actual: MatchOutcome): AccuracyResult {
  const predicted = prediction.winProbability.home > prediction.winProbability.away ? "home_win" : "away_win";
  const correct = actual !== "unknown" && predicted === actual;

  return {
    gameId: prediction.gameId,
    predicted,
    actual,
    correct,
    score: correct ? 1 : 0,
  };
}
