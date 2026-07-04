import type { ScheduleGame } from "../api/types";
import ResultsCalendarGrid from "../components/ResultsCalendarGrid";
import type { CalendarGridMap, ResultsMonthMetadata } from "../results/calendar";

export type ResultsTabProps = {
  calendarMap: CalendarGridMap;
  selectedDivisionTag: string;
  selectedMonthKey: string;
  onSelectMonthKey: (value: string) => void;
  monthOptions: Array<{ value: string; label: string }>;
  jumpDate: string;
  loading: boolean;
  error: string | null;
  metadata: ResultsMonthMetadata | null;
  onJumpDateChange: (value: string) => void;
  onSelectDivision: (tag: string) => void;
  onOpenMatch: (game: ScheduleGame) => void;
  onOpenH2H: (game: ScheduleGame) => void;
};

export default function ResultsTab(props: ResultsTabProps) {
  return <ResultsCalendarGrid {...props} />;
}
