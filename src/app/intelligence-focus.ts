import type { ScheduleGame } from "../api/types";
import type { CalendarGridMap } from "../results/calendar";

export type IntelligenceFocusCandidate = {
  drawerGame?: ScheduleGame | null;
  liveGames?: ScheduleGame[];
  calendarMap?: CalendarGridMap;
  selectedDivisionTag?: string;
};

function latestCalendarGame(calendarMap: CalendarGridMap | undefined, selectedDivisionTag: string | undefined): ScheduleGame | null {
  if (!calendarMap) return null;

  const dayKeys = Object.keys(calendarMap).sort().reverse();
  for (const dayKey of dayKeys) {
    const dayGroups = calendarMap[dayKey] ?? [];
    for (const group of dayGroups) {
      if (selectedDivisionTag && group.divisionTag !== selectedDivisionTag) continue;
      const latestMatch = group.games.at(-1)?.game ?? null;
      if (latestMatch) return latestMatch;
    }
  }

  return null;
}

export function selectIntelligenceFocusGame({
  drawerGame,
  liveGames,
  calendarMap,
  selectedDivisionTag,
}: IntelligenceFocusCandidate): ScheduleGame | null {
  if (drawerGame) return drawerGame;
  if (Array.isArray(liveGames) && liveGames.length > 0) return liveGames[0] ?? null;
  return latestCalendarGame(calendarMap, selectedDivisionTag);
}
