import type { DriftState } from "../calibration/prediction-drift.js";
import type { LiveState } from "../prediction/live-state-detector.js";
import type { PredictionRuntimeRow } from "./prediction-mapper.js";

export type PredictionRuntimeSummary = {
  liveStates: Record<LiveState, number>;
  averageConfidence: number;
  averageCalibratedConfidence: number;
  driftState: DriftState;
};

export type PredictionRuntimeEnvelope = {
  source: "api/results/live";
  generatedAt: string;
  count: number;
  status: Record<string, unknown>;
  predictions: PredictionRuntimeRow[];
  summary: PredictionRuntimeSummary;
};

export function buildPredictionRuntimeEnvelope(
  predictions: PredictionRuntimeRow[],
  status: Record<string, unknown>,
  generatedAt = new Date(),
  driftState: DriftState = "insufficient_data",
): PredictionRuntimeEnvelope {
  const ordered = [...predictions].sort((a, b) => {
    const left = String(a.gameId);
    const right = String(b.gameId);
    if (left === right) return 0;
    return left < right ? -1 : 1;
  });

  const summary = summarizePredictions(ordered, driftState);
  return {
    source: "api/results/live",
    generatedAt: generatedAt.toISOString(),
    count: ordered.length,
    status,
    predictions: ordered,
    summary,
  };
}

function summarizePredictions(predictions: PredictionRuntimeRow[], driftState: DriftState): PredictionRuntimeSummary {
  const liveStates: Record<LiveState, number> = {
    early: 0,
    mid: 0,
    late: 0,
    unknown: 0,
  };

  let confidenceSum = 0;
  let calibratedConfidenceSum = 0;

  for (const row of predictions) {
    liveStates[row.prediction.state] += 1;
    confidenceSum += row.prediction.confidence;
    calibratedConfidenceSum += row.calibration.calibratedConfidence;
  }

  const divisor = predictions.length || 1;
  return {
    liveStates,
    averageConfidence: round(confidenceSum / divisor),
    averageCalibratedConfidence: round(calibratedConfidenceSum / divisor),
    driftState,
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
