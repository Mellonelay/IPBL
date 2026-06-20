export type BookmakerFailureLike = {
  kind?: string | null;
  source?: string | null;
  leagueId?: number | null;
  error?: string | null;
};

export function summarizeBookmakerFailures(failures: BookmakerFailureLike[]): string | null {
  if (failures.length === 0) return null;
  const kinds = [...new Set(failures.map((failure) => failure.kind).filter((kind): kind is string => Boolean(kind)))];
  if (kinds.includes("zero_approved_games")) {
    return "Bookmaker live rows were found, but none matched the approved team registry.";
  }
  if (kinds.includes("parse_failed")) {
    return "Bookmaker live pages changed shape before any games could be parsed.";
  }
  if (kinds.includes("fetch_failed")) {
    return "Bookmaker live pages could not be fetched in the current runtime.";
  }
  return "Bookmaker source failures were reported.";
}
