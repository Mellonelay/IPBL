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
  // Empty query results are not proof of historical absence. An upstream caller
  // must provide explicit, scoped archive verification before asserting absence.
  const proof = input.coverage && typeof input.coverage === "object"
    ? input.coverage as Record<string, unknown>
    : {};
  const historyVerified = input.mergedItems.length === 0
    && input.failedSources.length === 0
    && input.successfulSources.includes("official-calendar")
    && proof.archiveComplete === true
    && proof.officialVerified === true
    && proof.identityResolved === true
    && proof.cutoffVerified === true;
  const availability = input.failedSources.length > 0
    || (input.mergedItems.length === 0 && !historyVerified)
    ? "partial" : "available";
  const source = input.sourceParts.join("+")
    || (historyVerified ? "verified-empty" : "unverified-empty");

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
      emptyReason: input.mergedItems.length === 0
        ? historyVerified ? "no_verified_history" : "incomplete_archive"
        : null,
      historyVerified,
      source,
      successfulSources: input.successfulSources,
      failedSources: input.failedSources,
      coverage: input.coverage,
    },
  };
}

export function sanitizeTeamHistorySourceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/max requests limit exceeded/i.test(message)) return "quota_exceeded";
  if (
    /relation .*team_history_games.* does not exist/i.test(message)
    || /could not find .*team_history_games.*schema cache/i.test(message)
  ) return "schema_not_ready";
  if (/not configured/i.test(message)) return "not_configured";
  if (/timeout|aborted/i.test(message)) return "timeout";
  const http = message.match(/HTTP\s+(\d{3})/i);
  if (http) return `http_${http[1]}`;
  return "source_error";
}
