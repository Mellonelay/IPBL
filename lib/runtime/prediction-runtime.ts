import { buildPrediction, type PredictionInput } from "../prediction/prediction-engine.js";
import { calibrateConfidence } from "../calibration/confidence-calibrator.js";
import { calculateSignalWeights } from "../calibration/signal-weighting.js";
import { detectPredictionDrift } from "../calibration/prediction-drift.js";
import { buildAdaptiveScore } from "../self-learning/adaptive-scorer.js";
import type { EvaluationResult } from "../backtesting/evaluator.js";
import type { ScheduleGame } from "../server/calendar-normalize.js";
import type { LiveFeedEnvelope } from "../server/live-feed.js";
import type { LiveQuarterPattern } from "../server/live-pattern-discovery.js";
import type { PredictionRuntimeEnvelope } from "./prediction-response.js";
import { buildPredictionRuntimeEnvelope as buildRuntimeEnvelope, type PredictionRuntimeSummary } from "./prediction-response.js";
import { mapLiveGameToPredictionInput, mapPredictionRuntimeRow } from "./prediction-mapper.js";
import { selectLiveSignal, normalizeLiveIntelligenceIndex } from "./live-intelligence-client.js";

export type PredictionRuntimeOptions = {
  generatedAt?: Date;
  baselineEvaluation?: EvaluationResult | null;
  recentEvaluation?: EvaluationResult | null;
  livePatterns?: Record<number, readonly LiveQuarterPattern[]>;
};

export function mapGameForPrediction(game: ScheduleGame): PredictionInput {
  return mapLiveGameToPredictionInput(game);
}

export { mapLiveGameToPredictionInput } from "./prediction-mapper.js";
export type { PredictionRuntimeRow } from "./prediction-mapper.js";
export type { PredictionRuntimeEnvelope, PredictionRuntimeSummary } from "./prediction-response.js";

export function buildPredictionRuntimeEnvelope(
  liveEnvelope: LiveFeedEnvelope,
  options: PredictionRuntimeOptions = {},
): PredictionRuntimeEnvelope {
  const drift = detectPredictionDrift(options.baselineEvaluation ?? null, options.recentEvaluation ?? null);
  const livePatterns = normalizeLiveIntelligenceIndex(options.livePatterns);
  const predictions = liveEnvelope.games.map((game) => {
    const prediction = buildPrediction(mapLiveGameToPredictionInput(game));
    const calibration = calibrateConfidence(prediction, options.recentEvaluation ?? null);
    const weights = calculateSignalWeights({
      momentum: prediction.momentum,
      liveState: prediction.state,
      odds: prediction.odds,
    });
    const adaptive = buildAdaptiveScore(prediction, weights, drift);
    return mapPredictionRuntimeRow(game, prediction, calibration, adaptive, drift, selectLiveSignal(livePatterns[game.gameId]));
  });

  return buildRuntimeEnvelope(predictions, liveEnvelope.status, options.generatedAt, drift.state);
}

export function buildPredictionRuntimeSummary(
  liveEnvelope: LiveFeedEnvelope,
  options: PredictionRuntimeOptions = {},
): PredictionRuntimeSummary {
  return buildPredictionRuntimeEnvelope(liveEnvelope, options).summary;
}
