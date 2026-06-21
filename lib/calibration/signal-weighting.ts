import type { MomentumState } from "../prediction/momentum";
import type { OddsMovement } from "../prediction/odds-analyzer";
import type { LiveState } from "../prediction/live-state-detector";

export interface SignalWeights {
  momentum: number;
  strength: number;
  liveState: number;
  odds: number;
}

export interface SignalWeightInput {
  momentum: MomentumState;
  liveState: LiveState;
  odds: OddsMovement;
}

export function calculateSignalWeights(input: SignalWeightInput): SignalWeights {
  const oddsWeight = input.odds.usable ? 0.12 : 0;
  const lateGameWeight = input.liveState === "late" ? 0.18 : 0.08;
  const momentumWeight = input.momentum === "neutral" ? 0.2 : 0.28;
  const strengthWeight = clamp(1 - oddsWeight - lateGameWeight - momentumWeight, 0.42, 0.72);

  return normalize({
    momentum: momentumWeight,
    strength: strengthWeight,
    liveState: lateGameWeight,
    odds: oddsWeight,
  });
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
