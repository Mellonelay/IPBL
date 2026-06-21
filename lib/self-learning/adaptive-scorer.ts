import type { PredictionOutput } from "../prediction/prediction-engine";
import type { SignalWeights } from "../calibration/signal-weighting";
import type { DriftReport } from "../calibration/prediction-drift";
import { createDriftRemediationPlan } from "./drift-remediator";
import { optimizeWeights } from "./weight-optimizer";

export interface AdaptiveScore {
  gameId: string | number;
  confidence: number;
  weights: SignalWeights;
  remediation: ReturnType<typeof createDriftRemediationPlan>;
}

export function buildAdaptiveScore(
  prediction: PredictionOutput,
  currentWeights: SignalWeights,
  drift: DriftReport,
): AdaptiveScore {
  const remediation = createDriftRemediationPlan(drift);
  const optimized = optimizeWeights(currentWeights, drift);

  return {
    gameId: prediction.gameId,
    confidence: round(clamp(prediction.confidence * remediation.confidenceMultiplier, 0.35, 0.92)),
    weights: optimized.weights,
    remediation,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
