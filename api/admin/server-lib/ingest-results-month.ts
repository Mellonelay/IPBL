import { parseCalendarItems, type ScheduleGame } from "./calendar-normalize.js";
import { canonicalDivisionLabel, IPBL_API_BASE, RESULTS_LANG } from "./results-sync-constants.js";

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

function formatApiDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function normalizeCalendarDate(value: string): string {
  const trimmed = value.trim();
  const datePart = trimmed.split("T")[0].split(" ")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const match = datePart.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return datePart;
}

export function normalizeCalendarGame(g: ScheduleGame): StoredCalendarGridGame {
  return {
    game: g,
    time: g.localTime,
    teams: `${g.team1.name} vs ${g.team2.name}`,
    score: g.scoreText,
    division: g.divisionLabel,
    divisionTag: g.tag,
    quarterTotals: g.fullScore
  };
}

export function createEmptyMonthMap(year: number, monthIndex: number, tag: string, label: string): StoredResultsMonthMap {
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const map: StoredResultsMonthMap = {};
  for (let d = 1; d <= count; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    map[iso] = [{ date: iso, division: label, divisionTag: tag, games: [] }];
  }
  return map;
}

export async function fetchScheduleGamesForMonth(tag: string, year: number, monthIndex: number, options: { timeoutMs?: number } = {}): Promise<ScheduleGame[]> {
  const dayStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const url = `${IPBL_API_BASE}/calendar?tag=${tag}&from=${dayStr}&to=${dayStr}&lang=${RESULTS_LANG}`;
  const controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
      if (response.ok) {
        const raw = (await response.json()) as unknown;
        return parseCalendarItems(raw, tag);
      }
      const retriable = response.status === 502 || response.status === 503 || response.status === 504 || response.status === 508;
      if (!retriable || attempt === 2) {
        throw new Error(`calendar ${response.status} for ${dayStr} tag=${tag}`);
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  } finally {
    clearTimeout(timeout);
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
  const tmp = createEmptyMonthMap(year, monthIndex, divisionTag, divisionLabel);
  for (const game of games) {
    const day = normalizeCalendarDate(game.localDate);
    const row = tmp[day];
    if (!row?.[0]) continue;
    row[0].games.push(normalizeCalendarGame(game));
  }
  for (const divisions of Object.values(tmp)) {
    for (const division of divisions) {
      division.games.sort((a, b) => a.time.localeCompare(b.time));
    }
  }
  return tmp;
}