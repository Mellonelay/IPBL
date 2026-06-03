import { USER_BETTING_WATCHLIST } from "./divisions";
import type { ResultsDivisionTag, WatchlistDivisionStatus } from "./divisions";
import type { Ma1xBetLiveMatch } from "./live-source";

export type SourceDiscoveredDivision = {
  source: Ma1xBetLiveMatch["source"];
  sourceChampId?: string | number | null;
  sourceLeagueName?: string;
  sourceDivisionName?: string;
  normalizedDivisionId?: ResultsDivisionTag;
  confidence: "exact_alias" | "team_pattern" | "source_unverified";
  status: WatchlistDivisionStatus;
  discoveredAt: string;
  evidence: {
    eventIds: Array<string | number>;
    teamNames: string[];
    rawLeagueNames: string[];
    responsePath?: string;
  };
};

export type DivisionDiscoveryResult = {
  sourceAvailable: boolean;
  discovered: SourceDiscoveredDivision[];
  watchlistStatuses: Record<ResultsDivisionTag, WatchlistDivisionStatus>;
  unavailableReason?: string;
};

function textBlob(match: Ma1xBetLiveMatch): string {
  return [match.division, match.homeTeam, match.awayTeam, match.leagueId].filter(Boolean).join(" ").toLowerCase();
}

export function discoverActiveDivisionsFromLiveMatches(matches: Ma1xBetLiveMatch[], options: { sourceAvailable?: boolean; unavailableReason?: string; discoveredAt?: string } = {}): DivisionDiscoveryResult {
  const sourceAvailable = options.sourceAvailable ?? true;
  const discoveredAt = options.discoveredAt ?? new Date().toISOString();
  const watchlistStatuses = USER_BETTING_WATCHLIST.reduce((acc, division) => {
    acc[division.id] = sourceAvailable ? division.defaultStatus : "source_unverified";
    return acc;
  }, {} as Record<ResultsDivisionTag, WatchlistDivisionStatus>);

  if (!sourceAvailable) {
    return { sourceAvailable: false, discovered: [], watchlistStatuses, unavailableReason: options.unavailableReason ?? "live source unavailable" };
  }

  const discovered: SourceDiscoveredDivision[] = [];
  for (const division of USER_BETTING_WATCHLIST) {
    const aliasMatches = matches.filter((match) => {
      const blob = textBlob(match);
      return division.sourceAliases.some((alias) => blob.includes(alias.toLowerCase()));
    });
    const firstMatch = aliasMatches[0];
    if (firstMatch) {
      watchlistStatuses[division.id] = "active";
      const discoveredDivision: SourceDiscoveredDivision = {
        source: firstMatch.source,
        confidence: "exact_alias",
        status: "active",
        discoveredAt,
        evidence: {
          eventIds: aliasMatches.map((match) => match.gameId).filter((id): id is string | number => id != null),
          teamNames: aliasMatches.flatMap((match) => [match.homeTeam, match.awayTeam]).filter((name): name is string => Boolean(name)),
          rawLeagueNames: [...new Set(aliasMatches.map((match) => match.division).filter(Boolean))],
        },
      };
      if (firstMatch.leagueId != null) discoveredDivision.sourceChampId = firstMatch.leagueId;
      if (firstMatch.division) discoveredDivision.sourceLeagueName = firstMatch.division;
      discoveredDivision.sourceDivisionName = division.displayLabel;
      discoveredDivision.normalizedDivisionId = division.id;
      discovered.push(discoveredDivision);
    } else {
      watchlistStatuses[division.id] = "inactive_or_not_currently_listed";
    }
  }
  return { sourceAvailable: true, discovered, watchlistStatuses };
}
