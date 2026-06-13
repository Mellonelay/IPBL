import { LIVE_DIVISIONS, type DivisionConfig } from "./divisions";

export type ActiveTeamConfig = {
  teamId: number;
  name: string;
  divisionTag: string;
};

/**
 * Verified from the official June 2026 result corpus. This is a safe bootstrap
 * registry; runtime team history remains the source of match/statistics truth.
 */
export const ACTIVE_TEAMS: ActiveTeamConfig[] = [
  { teamId: 76038, name: "Barnaul", divisionTag: "ipbl-66-m-pro-a" },
  { teamId: 76040, name: "Novosibirsk", divisionTag: "ipbl-66-m-pro-a" },
  { teamId: 76041, name: "Sochi", divisionTag: "ipbl-66-m-pro-a" },
  { teamId: 76039, name: "St. Petersburg", divisionTag: "ipbl-66-m-pro-a" },

  { teamId: 76051, name: "Kazan", divisionTag: "ipbl-66-m-pro-b" },
  { teamId: 76050, name: "Krasnodar", divisionTag: "ipbl-66-m-pro-b" },
  { teamId: 76049, name: "Samara", divisionTag: "ipbl-66-m-pro-b" },
  { teamId: 76052, name: "Tyumen", divisionTag: "ipbl-66-m-pro-b" },

  { teamId: 76057, name: "Kaliningrad", divisionTag: "ipbl-66-m-pro-c" },
  { teamId: 76058, name: "Moscow", divisionTag: "ipbl-66-m-pro-c" },
  { teamId: 76060, name: "Plavsk", divisionTag: "ipbl-66-m-pro-c" },
  { teamId: 76059, name: "Voronezh", divisionTag: "ipbl-66-m-pro-c" },

  { teamId: 76068, name: "Krasnoyarsk", divisionTag: "ipbl-66-m-pro-d" },
  { teamId: 76067, name: "Nizhny Novgorod", divisionTag: "ipbl-66-m-pro-d" },
  { teamId: 76066, name: "Rostov-on-Don", divisionTag: "ipbl-66-m-pro-d" },
  { teamId: 76065, name: "Volgograd", divisionTag: "ipbl-66-m-pro-d" },

  { teamId: 76061, name: "Ryazan", divisionTag: "ipbl-66-m-pro-u" },
  { teamId: 76064, name: "Salavat", divisionTag: "ipbl-66-m-pro-u" },
  { teamId: 76062, name: "Serov", divisionTag: "ipbl-66-m-pro-u" },
  { teamId: 76063, name: "Smolensk", divisionTag: "ipbl-66-m-pro-u" },

  { teamId: 76055, name: "Anapa", divisionTag: "ipbl-66-m-pro-z" },
  { teamId: 76054, name: "Magadan", divisionTag: "ipbl-66-m-pro-z" },

  { teamId: 76021, name: "Bryansk", divisionTag: "ipbl-66-w-pro-a" },
  { teamId: 76023, name: "Izhevsk", divisionTag: "ipbl-66-w-pro-a" },
  { teamId: 76022, name: "Magnitogorsk", divisionTag: "ipbl-66-w-pro-a" },
  { teamId: 76020, name: "Novokuznetsk", divisionTag: "ipbl-66-w-pro-a" },

  { teamId: 76012, name: "Cheboksary", divisionTag: "ipbl-66-w-pro-b" },
  { teamId: 76014, name: "Tambov", divisionTag: "ipbl-66-w-pro-b" },
  { teamId: 76015, name: "Tomsk", divisionTag: "ipbl-66-w-pro-b" },
  { teamId: 76013, name: "Yaroslavl", divisionTag: "ipbl-66-w-pro-b" },

  { teamId: 76029, name: "Kaluga", divisionTag: "ipbl-66-w-pro-c" },
  { teamId: 76030, name: "Murino", divisionTag: "ipbl-66-w-pro-c" },
  { teamId: 76031, name: "Norilsk", divisionTag: "ipbl-66-w-pro-c" },
  { teamId: 76028, name: "Vladivostok", divisionTag: "ipbl-66-w-pro-c" },

  { teamId: 76026, name: "Berezniki", divisionTag: "ipbl-66-w-pro-d" },
  { teamId: 76025, name: "Ekaterinburg", divisionTag: "ipbl-66-w-pro-d" },
  { teamId: 76027, name: "Khimki", divisionTag: "ipbl-66-w-pro-d" },
  { teamId: 76024, name: "Toliatti", divisionTag: "ipbl-66-w-pro-d" },

  { teamId: 76034, name: "Ivanovo", divisionTag: "ipbl-66-w-pro-g" },
  { teamId: 76032, name: "Kostroma", divisionTag: "ipbl-66-w-pro-g" },
  { teamId: 76035, name: "Penza", divisionTag: "ipbl-66-w-pro-g" },
  { teamId: 76036, name: "Stary Oskol", divisionTag: "ipbl-66-w-pro-g" },

  { teamId: 76018, name: "Kursk", divisionTag: "ipbl-66-w-pro-k" },
  { teamId: 76017, name: "Orenburg", divisionTag: "ipbl-66-w-pro-k" },
  { teamId: 76016, name: "Severodvinsk", divisionTag: "ipbl-66-w-pro-k" },
  { teamId: 76019, name: "Vologda", divisionTag: "ipbl-66-w-pro-k" },
];

export const TEAM_STATISTICS_DIVISIONS: DivisionConfig[] = LIVE_DIVISIONS;

export function teamsForDivision(divisionTag: string): ActiveTeamConfig[] {
  return ACTIVE_TEAMS
    .filter((team) => team.divisionTag === divisionTag)
    .sort((a, b) => a.name.localeCompare(b.name));
}
