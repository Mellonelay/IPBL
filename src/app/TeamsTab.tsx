import type { ScheduleGame } from "../api/types";
import TeamStatistics from "../components/TeamStatistics";

export type TeamsTabProps = {
  season: number;
  refreshToken: number;
  onOpenGame: (game: ScheduleGame) => void;
};

export default function TeamsTab(props: TeamsTabProps) {
  return <TeamStatistics {...props} />;
}
