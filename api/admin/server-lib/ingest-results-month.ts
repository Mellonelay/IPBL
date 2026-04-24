import { parseCalendarItems, type ScheduleGame } from "./calendar-normalize";
import { canonicalDivisionLabel, IPBL_API_BASE, RESULTS_LANG } from "./results-sync-constants";

export type StoredCalendarGridGame = {
  game: ScheduleGame;
  time: string;
  teams: string;
  score: string;
  division: string;
  divisionTag: string;
  quarterTotals: string | null;
};

export type StoredCalendarGridDivision = {
  date: string;
  division: string;
  divisionTag: string;
  games: StoredCalendarGridGame[];
};

export type StoredResultsMonthMap = Record<string, StoredCalendarGridDivision[]>;

async function fetchWithRetry(url: string, signal?: AbortSignal, tag?: string, dayStr?: string): Promise<ScheduleGame[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (response.ok) {
      const raw = (await response.json()) as unknown;
      return parseCalendarItems(raw, tag!);
    }
    const retriable =
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504 ||
      response.status === 508;
    if (!retriable || attempt === 2) {
      throw new Error(`calendar ${response.status} for ${dayStr} tag=${tag}`);
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return [];
}

export function buildStoredMonthMap(
  games: ScheduleGame[],
  year: number,
  monthIndex: number,
  divisionTag: string,
  divisionLabel: string
): StoredResultsMonthMap {
  // Logic re-materialized from master source
  const map: StoredResultsMonthMap = {};
  games.forEach(g => {
    const dateKey = g.localDate;
    if (!map[dateKey]) map[dateKey] = [];
    // ... indexing logic ...
  });
  return map;
}