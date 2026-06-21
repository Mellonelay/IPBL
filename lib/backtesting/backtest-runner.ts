import { getPredictions } from "./prediction-store";
import { evaluate, type EvaluationResult } from "./evaluator";
import { resolveOutcome, type FinalMatchState, type MatchOutcome } from "./outcome-resolver";

export interface BacktestMatch extends FinalMatchState {
  gameId: string | number;
}

export function runBacktest(matches: BacktestMatch[]): EvaluationResult {
  const outcomes = new Map<string, MatchOutcome>();

  for (const match of matches) {
    outcomes.set(String(match.gameId), resolveOutcome(match));
  }

  return evaluate(getPredictions(), outcomes);
}
