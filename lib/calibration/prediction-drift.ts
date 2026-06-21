import type { EvaluationResult } from "../backtesting/evaluator";

export type DriftState = "stable" | "watch" | "drifting" | "insufficient_data";

export interface DriftReport {
  state: DriftState;
  baselineAccuracy: number;
  recentAccuracy: number;
  delta: number;
}

export function detectPredictionDrift(
  baseline?: EvaluationResult | null,
  recent?: EvaluationResult | null,
): DriftReport {
  if (!baseline || !recent || baseline.evaluated < 10 || recent.evaluated < 10) {
    return { state: "insufficient_data", baselineAccuracy: 0, recentAccuracy: 0, delta: 0 };
  }

  const delta = recent.accuracy - baseline.accuracy;
  const state: DriftState = delta <= -0.12 ? "drifting" : delta <= -0.06 ? "watch" : "stable";

  return {
    state,
    baselineAccuracy: round(baseline.accuracy),
    recentAccuracy: round(recent.accuracy),
    delta: round(delta),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
