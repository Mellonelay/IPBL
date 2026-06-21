import type { EvaluationResult } from "../backtesting/evaluator";
import type { PredictionOutput } from "../prediction/prediction-engine";

export interface CalibrationResult {
  gameId: string | number;
  originalConfidence: number;
  calibratedConfidence: number;
  reason: "accuracy_boost" | "accuracy_penalty" | "insufficient_history";
}

export function calibrateConfidence(
  prediction: PredictionOutput,
  recentEvaluation?: EvaluationResult | null,
): CalibrationResult {
  if (!recentEvaluation || recentEvaluation.evaluated < 10) {
    return {
      gameId: prediction.gameId,
      originalConfidence: prediction.confidence,
      calibratedConfidence: round(prediction.confidence),
      reason: "insufficient_history",
    };
  }

  const adjustment = recentEvaluation.accuracy >= 0.62 ? 0.04 : -0.06;
  return {
    gameId: prediction.gameId,
    originalConfidence: prediction.confidence,
    calibratedConfidence: round(clamp(prediction.confidence + adjustment, 0.45, 0.92)),
    reason: adjustment > 0 ? "accuracy_boost" : "accuracy_penalty",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
