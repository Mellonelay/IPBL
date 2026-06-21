export type LiveState = "early" | "mid" | "late" | "unknown";

export function detectLiveState(period?: number | null): LiveState {
  if (typeof period !== "number" || period <= 0) return "unknown";
  if (period <= 1) return "early";
  if (period <= 3) return "mid";
  return "late";
}
