export type ResultStateKind =
  | "loaded"
  | "confirmed_empty"
  | "source_unavailable"
  | "division_inactive"
  | "historical_unverified"
  | "pending_backfill"
  | "unverified";

export type DivisionDayResultState<TMatch = unknown> =
  | { kind: "loaded"; divisionId: string; date: string; matches: TMatch[]; source: string }
  | { kind: "confirmed_empty"; divisionId: string; date: string; source: string; checkedAt: string }
  | { kind: "source_unavailable"; divisionId: string; date: string; reason: string }
  | { kind: "division_inactive"; divisionId: string; date: string; reason: "inactive_or_not_currently_listed" }
  | { kind: "historical_unverified" | "pending_backfill"; divisionId: string; date: string; reason: "no_confirmed_historical_source" }
  | { kind: "unverified"; divisionId: string; date: string; reason: string };

export type ResultsEvidenceMetadata = {
  status: "ok" | "source_unavailable" | "legacy";
  source: string;
  checkedAt: string;
  verifiedThroughDate: string | null;
};

export function loadedResultState<TMatch>(args: { divisionId: string; date: string; matches: TMatch[]; source: string }): DivisionDayResultState<TMatch> {
  return { kind: "loaded", ...args };
}

export function confirmedEmptyResultState(args: { divisionId: string; date: string; source: string; checkedAt?: string }): DivisionDayResultState<never> {
  return { kind: "confirmed_empty", divisionId: args.divisionId, date: args.date, source: args.source, checkedAt: args.checkedAt ?? new Date().toISOString() };
}

export function historicalUnverifiedResultState(divisionId: string, date: string): DivisionDayResultState<never> {
  return { kind: "historical_unverified", divisionId, date, reason: "no_confirmed_historical_source" };
}

export function sourceUnavailableResultState(divisionId: string, date: string, reason: string): DivisionDayResultState<never> {
  return { kind: "source_unavailable", divisionId, date, reason };
}

export function divisionInactiveResultState(divisionId: string, date: string): DivisionDayResultState<never> {
  return { kind: "division_inactive", divisionId, date, reason: "inactive_or_not_currently_listed" };
}

export function resultStateForStoredDay<TMatch>(args: {
  divisionId: string;
  date: string;
  matches: TMatch[];
  metadata: ResultsEvidenceMetadata | null;
}): DivisionDayResultState<TMatch> {
  if (args.matches.length > 0) {
    return loadedResultState({
      divisionId: args.divisionId,
      date: args.date,
      matches: args.matches,
      source: args.metadata?.source ?? "results-kv",
    });
  }
  const verified = Boolean(args.metadata?.verifiedThroughDate && args.date <= args.metadata.verifiedThroughDate);
  if (verified && (args.metadata?.status === "ok" || args.metadata?.status === "source_unavailable")) {
    return confirmedEmptyResultState({
      divisionId: args.divisionId,
      date: args.date,
      source: args.metadata.source,
      checkedAt: args.metadata.checkedAt,
    });
  }
  if (args.metadata?.status === "source_unavailable") {
    return sourceUnavailableResultState(args.divisionId, args.date, "latest sync source unavailable");
  }
  if (args.metadata?.status === "legacy") {
    return historicalUnverifiedResultState(args.divisionId, args.date);
  }
  return { kind: "unverified", divisionId: args.divisionId, date: args.date, reason: "no verified sync metadata" };
}

export function hasLoadedMatches<TMatch>(state: DivisionDayResultState<TMatch>): state is Extract<DivisionDayResultState<TMatch>, { kind: "loaded" }> {
  return state.kind === "loaded";
}

export function shouldShowNoMatchesToday<TMatch>(state: DivisionDayResultState<TMatch>): boolean {
  return state.kind === "confirmed_empty";
}

export function describeResultState<TMatch>(state: DivisionDayResultState<TMatch>): string {
  switch (state.kind) {
    case "loaded": return `${state.matches.length} matches loaded`;
    case "confirmed_empty": return "No matches today";
    case "source_unavailable": return "Source unavailable — results not yet verified";
    case "division_inactive": return "Selected division is not currently listed";
    case "historical_unverified":
    case "pending_backfill": return "Results not yet verified";
    case "unverified": return "Results not yet verified";
  }
}
