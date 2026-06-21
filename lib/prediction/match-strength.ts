export interface StrengthInput {
  score1: number;
  score2: number;
}

export function calculateMatchStrength(input: StrengthInput): number {
  const total = input.score1 + input.score2;
  if (total <= 0) return 0.5;
  return clamp(input.score1 / total, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
