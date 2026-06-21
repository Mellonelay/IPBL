export type MatchOutcome = "home_win" | "away_win" | "draw" | "unknown";

export interface FinalMatchState {
  score1?: number | null;
  score2?: number | null;
}

export function resolveOutcome(match: FinalMatchState): MatchOutcome {
  if (typeof match.score1 !== "number" || typeof match.score2 !== "number") return "unknown";
  if (match.score1 > match.score2) return "home_win";
  if (match.score2 > match.score1) return "away_win";
  return "draw";
}
