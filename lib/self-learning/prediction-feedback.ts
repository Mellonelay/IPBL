import type { EvaluationResult } from "../backtesting/evaluator.js";
import type { DriftReport } from "../calibration/prediction-drift.js";

export interface PredictionFeedback {
  evaluation: EvaluationResult;
  drift: DriftReport;
  grade: "excellent" | "acceptable" | "weak" | "unknown";
}

export function buildPredictionFeedback(evaluation: EvaluationResult, drift: DriftReport): PredictionFeedback {
  if (evaluation.evaluated === 0) {
    return { evaluation, drift, grade: "unknown" };
  }

  const grade = evaluation.accuracy >= 0.7 ? "excellent" : evaluation.accuracy >= 0.58 ? "acceptable" : "weak";
  return { evaluation, drift, grade };
}
