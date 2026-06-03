export type ResultStateKind =
  | "loaded"
  | "confirmed_empty"
  | "source_unavailable"
  | "division_inactive"
  | "historical_unverified"
  | "unverified";

export type DivisionDayResultState<TMatch = unknown> =
  | { kind: "loaded"; divisionId: string; date: string; matches: TMatch[]; source: string }
  | { kind: "confirmed_empty"; divisionId: string; date: string; source: string; checkedAt: string }
  | { kind: "source_unavailable"; divisionId: string; date: string; reason: string }
  | { kind: "division_inactive"; divisionId: string; date: string; reason: "inactive_or_not_currently_listed" }
  | { kind: "historical_unverified"; divisionId: string; date: string; reason: "no_confirmed_historical_source" }
  | { kind: "unverified"; divisionId: string; date: string; reason: string };

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

export function hasLoadedMatches<TMatch>(state: DivisionDayResultState<TMatch>): state is Extract<DivisionDayResultState<TMatch>, { kind: "loaded" }> {
  return state.kind === "loaded";
}

export function shouldShowNoMatchesToday<TMatch>(state: DivisionDayResultState<TMatch>): boolean {
  return state.kind === "confirmed_empty";
}

export function describeResultState<TMatch>(state: DivisionDayResultState<TMatch>): string {
  switch (state.kind) {
    case "loaded":
      return `${state.matches.length} matches loaded`;
    case "confirmed_empty":
      return "Confirmed no matches";
    case "source_unavailable":
      return "Source unavailable";
    case "division_inactive":
      return "Division not currently listed";
    case "historical_unverified":
      return "Historical data unverified";
    case "unverified":
      return "Result state unverified";
  }
}
