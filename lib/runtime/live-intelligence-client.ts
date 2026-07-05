import type { LiveQuarterPattern } from "../server/live-pattern-discovery.js";

export type LiveIntelligenceIndex = Record<number, readonly LiveQuarterPattern[]>;

export function selectLiveSignal(patterns: readonly LiveQuarterPattern[] | undefined): LiveQuarterPattern | null {
  if (!patterns?.length) return null;
  return [...patterns].sort((left, right) => {
    const confidenceDelta = right.confidence - left.confidence;
    if (confidenceDelta !== 0) return confidenceDelta;
    return left.patternId.localeCompare(right.patternId);
  })[0] ?? null;
}

export function normalizeLiveIntelligenceIndex(index: LiveIntelligenceIndex | undefined): LiveIntelligenceIndex {
  if (!index) return {};
  return Object.fromEntries(
    Object.entries(index)
      .map(([gameId, patterns]) => [Number(gameId), [...patterns]] as const)
      .filter(([gameId]) => Number.isFinite(gameId)),
  );
}
