import { calculateMomentum, type MatchState, type MomentumState } from "./momentum";
import { calculateMatchStrength } from "./match-strength";
import { analyzeOdds, type OddsMovement } from "./odds-analyzer";
import { detectLiveState, type LiveState } from "./live-state-detector";

export interface PredictionInput extends MatchState {
  gameId: number | string;
  previousOdds?: number | null;
  currentOdds?: number | null;
}

export interface PredictionOutput {
  gameId: number | string;
  momentum: MomentumState;
  strength: number;
  state: LiveState;
  odds: OddsMovement;
  winProbability: {
    home: number;
    away: number;
  };
  confidence: number;
}

export function buildPrediction(match: PredictionInput): PredictionOutput {
  const momentum = calculateMomentum(match);
  const strength = calculateMatchStrength(match);
  const state = detectLiveState(match.period);
  const odds = analyzeOdds(match.currentOdds, match.previousOdds);
  const homeProbability = clamp((strength * 0.7) + (momentumBias(momentum) * 0.3), 0.05, 0.95);
  const confidence = clamp(0.55 + Math.abs(homeProbability - 0.5) + (odds.usable ? 0.05 : 0), 0.55, 0.9);

  return {
    gameId: match.gameId,
    momentum,
    strength,
    state,
    odds,
    winProbability: {
      home: round(homeProbability),
      away: round(1 - homeProbability),
    },
    confidence: round(confidence),
  };
}

function momentumBias(momentum: MomentumState): number {
  if (momentum === "home_up") return 0.65;
  if (momentum === "away_up") return 0.35;
  return 0.5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
