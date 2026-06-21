export type MomentumState = "home_up" | "away_up" | "neutral";

export interface MatchState {
  score1: number;
  score2: number;
  period: number;
  timeToGo?: string | null;
}

export function calculateMomentum(match: MatchState): MomentumState {
  const diff = match.score1 - match.score2;
  const latePeriodWeight = match.period >= 4 ? 1.25 : 1;
  const weightedDiff = diff * latePeriodWeight;

  if (weightedDiff >= 6) return "home_up";
  if (weightedDiff <= -6) return "away_up";
  return "neutral";
}
