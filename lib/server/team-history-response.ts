import type { StoredTeamHistoryItem } from "./team-history-from-results.js";

export type TeamHistoryRange = 5 | 10 | 30 | "all";

export type TeamHistoryResponsePlan = {
  status: 200 | 503;
  availability: "available" | "partial" | "unavailable";
  source: string;
  body: Record<string, unknown>;
};

export function planTeamHistoryResponse(input: {
  mergedItems: StoredTeamHistoryItem[];
  range: TeamHistoryRange;
  successfulSources: string[];
  failedSources: string[];
  sourceParts: string[];
  coverage: unknown;
}): TeamHistoryResponsePlan {
  if (input.successfulSources.length === 0) {
    return {
      status: 503,
      availability: "unavailable",
      source: "unavailable",
      body: {
        error: "team_history_unavailable",
        availability: "unavailable",
        retryable: true,
        coverage: input.coverage,
      },
    };
  }
  const items = input.range === "all"
    ? input.mergedItems
    : input.mergedItems.slice(0, input.range);
  const availability = input.failedSources.length > 0 ? "partial" : "available";
  const source = input.sourceParts.join("+") || "verified-empty";

  return {
    status: 200,
    availability,
    source,
    body: {
      data: {
        items,
        totalCount: items.length,
        totalAvailable: input.mergedItems.length,
        range: input.range,
      },
      availability,
      emptyReason: input.mergedItems.length === 0 ? "no_verified_history" : null,
      source,
      successfulSources: input.successfulSources,
      failedSources: input.failedSources,
      coverage: input.coverage,
    },
  };
}
