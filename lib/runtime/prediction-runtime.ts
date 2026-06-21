import { buildPrediction, type PredictionInput } from "../prediction/prediction-engine.ts";
import { calibrateConfidence } from "../calibration/confidence-calibrator.ts";
import { calculateSignalWeights } from "../calibration/signal-weighting.ts";
import { detectPredictionDrift } from "../calibration/prediction-drift.ts";
import { buildAdaptiveScore } from "../self-learning/adaptive-scorer.ts";
import type { EvaluationResult } from "../backtesting/evaluator.ts";
import type { ScheduleGame } from "../server/calendar-normalize.ts";
import type { PredictionRuntimeEnvelope } from "./prediction-response.ts";
import { buildPredictionRuntimeEnvelope as buildRuntimeEnvelope, type PredictionRuntimeSummary } from "./prediction-response.ts";
import { mapLiveGameToPredictionInput, mapPredictionRuntimeRow } from "./prediction-mapper.ts";
import type { LiveFeedEnvelope } from "../../api/results/live.ts";

export type PredictionRuntimeOptions = {
  generatedAt?: Date;
  baselineEvaluation?: EvaluationResult | null;
  recentEvaluation?: EvaluationResult | null;
};

export function mapGameForPrediction(game: ScheduleGame): PredictionInput {
  return mapLiveGameToPredictionInput(game);
}

export { mapLiveGameToPredictionInput } from "./prediction-mapper.ts";
export type { PredictionRuntimeRow } from "./prediction-mapper.ts";
export type { PredictionRuntimeEnvelope, PredictionRuntimeSummary } from "./prediction-response.ts";

export function buildPredictionRuntimeEnvelope(
  liveEnvelope: LiveFeedEnvelope,
  options: PredictionRuntimeOptions = {},
): PredictionRuntimeEnvelope {
  const drift = detectPredictionDrift(options.baselineEvaluation ?? null, options.recentEvaluation ?? null);
  const predictions = liveEnvelope.games.map((game) => {
    const prediction = buildPrediction(mapLiveGameToPredictionInput(game));
    const calibration = calibrateConfidence(prediction, options.recentEvaluation ?? null);
    const weights = calculateSignalWeights({
      momentum: prediction.momentum,
      liveState: prediction.state,
      odds: prediction.odds,
    });
    const adaptive = buildAdaptiveScore(prediction, weights, drift);
    return mapPredictionRuntimeRow(game, prediction, calibration, adaptive, drift);
  });

  return buildRuntimeEnvelope(predictions, liveEnvelope.status, options.generatedAt, drift.state);
}

export function buildPredictionRuntimeSummary(
  liveEnvelope: LiveFeedEnvelope,
  options: PredictionRuntimeOptions = {},
): PredictionRuntimeSummary {
  return buildPredictionRuntimeEnvelope(liveEnvelope, options).summary;
}
