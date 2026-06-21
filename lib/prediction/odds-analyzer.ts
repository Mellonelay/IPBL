export type OddsDirection = "up" | "down" | "stable" | "unavailable";

export interface OddsMovement {
  change: number;
  direction: OddsDirection;
  usable: boolean;
}

export function analyzeOdds(current?: number | null, previous?: number | null): OddsMovement {
  if (typeof current !== "number" || typeof previous !== "number") {
    return { change: 0, direction: "unavailable", usable: false };
  }

  const change = current - previous;
  return {
    change,
    direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
    usable: true,
  };
}
