import type { DriftReport } from "../calibration/prediction-drift.js";
import type { SignalWeights } from "../calibration/signal-weighting.js";

export interface WeightOptimizationResult {
  weights: SignalWeights;
  reason: "stable_keep" | "watch_shift_to_strength" | "drift_reduce_volatility" | "insufficient_data";
}

export function optimizeWeights(current: SignalWeights, drift: DriftReport): WeightOptimizationResult {
  if (drift.state === "insufficient_data") {
    return { weights: current, reason: "insufficient_data" };
  }

  if (drift.state === "stable") {
    return { weights: current, reason: "stable_keep" };
  }

  if (drift.state === "watch") {
    return {
      weights: normalize({
        ...current,
        strength: current.strength + 0.05,
        odds: Math.max(0, current.odds - 0.03),
        momentum: Math.max(0, current.momentum - 0.02),
      }),
      reason: "watch_shift_to_strength",
    };
  }

  return {
    weights: normalize({
      strength: current.strength + 0.08,
      liveState: current.liveState + 0.03,
      momentum: Math.max(0, current.momentum - 0.06),
      odds: Math.max(0, current.odds - 0.05),
    }),
    reason: "drift_reduce_volatility",
  };
}

function normalize(weights: SignalWeights): SignalWeights {
  const total = weights.momentum + weights.strength + weights.liveState + weights.odds;
  return {
    momentum: round(weights.momentum / total),
    strength: round(weights.strength / total),
    liveState: round(weights.liveState / total),
    odds: round(weights.odds / total),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
