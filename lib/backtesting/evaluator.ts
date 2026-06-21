import type { PredictionOutput } from "../prediction/prediction-engine.js";
import { computeAccuracy, type AccuracyResult } from "./accuracy.js";
import type { MatchOutcome } from "./outcome-resolver.js";

export interface EvaluationResult {
  total: number;
  evaluated: number;
  correct: number;
  accuracy: number;
  results: AccuracyResult[];
}

export function evaluate(predictions: PredictionOutput[], outcomes: Map<string, MatchOutcome>): EvaluationResult {
  const results = predictions
    .map((prediction) => {
      const actual = outcomes.get(String(prediction.gameId)) ?? "unknown";
      return computeAccuracy(prediction, actual);
    })
    .filter((result) => result.actual !== "unknown");

  const correct = results.reduce((sum, result) => sum + result.score, 0);

  return {
    total: predictions.length,
    evaluated: results.length,
    correct,
    accuracy: results.length === 0 ? 0 : correct / results.length,
    results,
  };
}
