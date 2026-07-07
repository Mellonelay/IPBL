import { ACTIVE_TEAMS, TEAM_STATISTICS_DIVISIONS, teamsForDivision } from "../../src/config/teams.js";
import { LIVE_DIVISION_TAGS } from "../../src/config/divisions.js";

export type TeamStatisticsLatestHistoryRow = {
  gameId: number | null;
  localDate: string | null;
  localTime: string | null;
  score: string | null;
  fullScore: string | null;
  team1: string | null;
  team2: string | null;
};

export type TeamStatisticsCoverageWindow = {
  from: string;
  to: string;
  ok: boolean;
  itemCount: number;
  error: string | null;
};

export type TeamStatisticsCoverage = {
  season: number;
  divisionTag: string;
  loadedMonths: number[];
  currentOfficialOnline: {
    ok: boolean;
    itemCount: number;
    error: string | null;
  };
  recentOfficialCalendar: {
    ok: boolean;
    itemCount: number;
    error: string | null;
    windows: TeamStatisticsCoverageWindow[];
  };
};

export type TeamStatisticsTeamResult = {
  teamId: number;
  name: string;
  divisionTag: string;
  url: string;
  http: number | null;
  ok: boolean;
  attempt: number | null;
  error: string | null;
  source: string | null;
  coverage: TeamStatisticsCoverage | null;
  totalCount: number | null;
  completedCount: number;
  quarterMatrixCount: number;
  latest: TeamStatisticsLatestHistoryRow | null;
};

export type TeamStatisticsRegistry = {
  divisionCount: number;
  liveDivisionCount: number;
  teamCount: number;
  uniqueTeamCount: number;
  divisions: Array<{
    tag: string;
    label: string;
    expectedTeamCount: number;
    actualTeamCount: number;
  }>;
};

export type TeamStatisticsDivisionSummary = TeamStatisticsRegistry["divisions"][number] & {
  okTeams: number;
  teamsWithHistory: number;
  teamsWithQuarterMatrix: number;
  sources: string[];
};

export type TeamStatisticsReconciliationSummary = {
  generatedAt: string;
  base: string;
  season: number;
  timeoutMs: number;
  retries: number;
  registry: TeamStatisticsRegistry;
  divisionSummary: TeamStatisticsDivisionSummary[];
  totals: {
    teamsChecked: number;
    okTeams: number;
    teamsWithHistory: number;
    teamsWithQuarterMatrix: number;
  };
  classification: "RECONCILED" | "PARTIAL";
  failures: string[];
  policy: {
    oddsDeploymentAllowed: false;
    productionMutation: false;
    sourceModel: string;
  };
};

export type TeamStatisticsReconciliationOutput = {
  summary: TeamStatisticsReconciliationSummary;
  teams: TeamStatisticsTeamResult[];
};

function isTeamStatisticsCoverage(value: unknown): value is TeamStatisticsCoverage {
  if (!value || typeof value !== "object") return false;
  const coverage = value as Partial<TeamStatisticsCoverage>;
  if (!Number.isFinite(coverage.season) || typeof coverage.divisionTag !== "string") return false;
  if (!Array.isArray(coverage.loadedMonths) || coverage.loadedMonths.some((month) => !Number.isInteger(month))) return false;

  const online = coverage.currentOfficialOnline;
  if (!online || typeof online !== "object") return false;
  if (typeof online.ok !== "boolean" || !Number.isFinite(online.itemCount) || (typeof online.error !== "string" && online.error !== null)) return false;

  const calendar = coverage.recentOfficialCalendar;
  if (!calendar || typeof calendar !== "object") return false;
  if (typeof calendar.ok !== "boolean" || !Number.isFinite(calendar.itemCount) || (typeof calendar.error !== "string" && calendar.error !== null)) return false;
  if (!Array.isArray(calendar.windows)) return false;
  for (const window of calendar.windows) {
    if (!window || typeof window !== "object") return false;
    const entry = window as Partial<TeamStatisticsCoverageWindow>;
    if (typeof entry.from !== "string" || typeof entry.to !== "string") return false;
    if (typeof entry.ok !== "boolean" || !Number.isFinite(entry.itemCount) || (typeof entry.error !== "string" && entry.error !== null)) return false;
  }
  return true;
}

export function buildTeamStatisticsRegistry(): TeamStatisticsRegistry {
  return {
    divisionCount: TEAM_STATISTICS_DIVISIONS.length,
    liveDivisionCount: LIVE_DIVISION_TAGS.length,
    teamCount: ACTIVE_TEAMS.length,
    uniqueTeamCount: new Set(ACTIVE_TEAMS.map((team) => team.teamId)).size,
    divisions: TEAM_STATISTICS_DIVISIONS.map((division) => ({
      tag: division.tag,
      label: division.label,
      expectedTeamCount: division.tag === "ipbl-66-m-pro-z" ? 2 : 4,
      actualTeamCount: teamsForDivision(division.tag).length,
    })),
  };
}

export function buildTeamStatisticsDivisionSummary(
  teamResults: TeamStatisticsTeamResult[],
  registry: TeamStatisticsRegistry = buildTeamStatisticsRegistry(),
): TeamStatisticsDivisionSummary[] {
  return registry.divisions.map((division) => {
    const teams = teamResults.filter((team) => team.divisionTag === division.tag);
    return {
      ...division,
      okTeams: teams.filter((team) => team.ok).length,
      teamsWithHistory: teams.filter((team) => Number(team.completedCount) > 0).length,
      teamsWithQuarterMatrix: teams.filter((team) => Number(team.quarterMatrixCount) > 0).length,
      sources: [...new Set(teams.map((team) => team.source).filter(Boolean))],
    };
  });
}

export function buildTeamStatisticsReconciliation(
  teamResults: TeamStatisticsTeamResult[],
  input: {
    base: string;
    season: number;
    timeoutMs: number;
    retries: number;
    generatedAt?: string;
    registry?: TeamStatisticsRegistry;
  },
): TeamStatisticsReconciliationOutput {
  const registry = input.registry ?? buildTeamStatisticsRegistry();
  const divisionSummary = buildTeamStatisticsDivisionSummary(teamResults, registry);
  const failures: string[] = [];
  const expectedDivisionCount = LIVE_DIVISION_TAGS.length;
  const expectedTeamCount = ACTIVE_TEAMS.length;
  if (registry.divisionCount !== expectedDivisionCount || registry.liveDivisionCount !== expectedDivisionCount) {
    failures.push("division_count_mismatch");
  }
  if (registry.teamCount !== expectedTeamCount || registry.uniqueTeamCount !== expectedTeamCount) {
    failures.push("team_count_mismatch");
  }
  for (const division of divisionSummary) {
    if (division.actualTeamCount !== division.expectedTeamCount) failures.push(`team_count_mismatch:${division.tag}`);
    if (division.okTeams !== division.actualTeamCount) failures.push(`history_fetch_failure:${division.tag}`);
    if (division.teamsWithHistory === 0) failures.push(`no_history:${division.tag}`);
  }
  for (const team of teamResults) {
    if (!isTeamStatisticsCoverage(team.coverage)) {
      failures.push(`coverage_missing:${team.divisionTag}:${team.teamId}`);
      continue;
    }
    if (team.coverage.season !== input.season) {
      failures.push(`coverage_season_mismatch:${team.divisionTag}:${team.teamId}`);
    }
    if (team.coverage.divisionTag !== team.divisionTag) {
      failures.push(`coverage_division_mismatch:${team.divisionTag}:${team.teamId}`);
    }
    if (!team.coverage.currentOfficialOnline.ok && !team.coverage.recentOfficialCalendar.ok) {
      failures.push(`coverage_unavailable:${team.divisionTag}:${team.teamId}`);
    }
    if (team.coverage.currentOfficialOnline.itemCount <= 0 && team.coverage.recentOfficialCalendar.itemCount <= 0) {
      failures.push(`coverage_empty:${team.divisionTag}:${team.teamId}`);
    }
  }

  return {
    summary: {
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      base: input.base,
      season: input.season,
      timeoutMs: input.timeoutMs,
      retries: input.retries,
      registry,
      divisionSummary,
      totals: {
        teamsChecked: teamResults.length,
        okTeams: teamResults.filter((team) => team.ok).length,
        teamsWithHistory: teamResults.filter((team) => Number(team.completedCount) > 0).length,
        teamsWithQuarterMatrix: teamResults.filter((team) => Number(team.quarterMatrixCount) > 0).length,
      },
      classification: failures.length === 0 ? "RECONCILED" : "PARTIAL",
      failures,
      policy: {
        oddsDeploymentAllowed: false,
        productionMutation: false,
        sourceModel: "Results KV + official online + recent official daily calendar windows",
      },
    },
    teams: teamResults,
  };
}
