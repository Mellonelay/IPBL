import { TEAM_STATISTICS_DIVISIONS, teamsForDivision } from "../config/teams";
import type { TeamRange } from "../teams/statistics";

export const DEFAULT_TEAM_STATISTICS_DIVISION = "ipbl-66-m-pro-a";

export function resolveTeamSelectionFromParams(params: URLSearchParams): { divisionTag: string; teamId: number; range: TeamRange } {
  const requestedDivision = params.get("division") ?? DEFAULT_TEAM_STATISTICS_DIVISION;
  const divisionTag = TEAM_STATISTICS_DIVISIONS.some((division) => division.tag === requestedDivision)
    ? requestedDivision
    : DEFAULT_TEAM_STATISTICS_DIVISION;
  const teams = teamsForDivision(divisionTag);
  const requestedTeamId = Number(params.get("team"));
  const teamId = teams.some((team) => team.teamId === requestedTeamId)
    ? requestedTeamId
    : teams[0]?.teamId ?? 0;
  const requestedRange = params.get("range");
  const range: TeamRange = requestedRange === "all"
    ? "all"
    : requestedRange === "5" || requestedRange === "10" || requestedRange === "30"
      ? Number(requestedRange) as 5 | 10 | 30
      : 30;
  return { divisionTag, teamId, range };
}
