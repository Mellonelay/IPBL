import { parseCalendarItems, type ScheduleGame } from "./calendar-normalize.js";
import { canonicalDivisionLabel, IPBL_API_BASE, RESULTS_LANG } from "./results-sync-constants.js";

export type {
  StoredCalendarGridGame,
  StoredCalendarGridDivision,
  StoredResultsMonthMap,
} from "./results-types.js";
import type { StoredCalendarGridGame, StoredResultsMonthMap } from "./results-types.js";
import { dedupeFinishedGames } from "./results-hardening.js";

function monthDayKeys(year: number, monthIndex: number): string[] {
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const out: string[] = [];
  for (let day = 1; day <= count; day += 1) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    out.push(iso);
  }
  return out;
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

export function parseQuarterTotals(fullScore: string | null, partial = false): string | null {
  if (!fullScore) return null;
  const totals = fullScore
    .split(",")
    .map((part) => part.trim())
    .map((part, index) => {
      const points = part
        .split(":")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));
      if (points.length !== 2) return null;
      return `Q${index + 1} ${points[0] + points[1]}`;
    })
    .filter((value): value is string => Boolean(value));
  if (totals.length === 0) return null;
  return partial ? `${totals.join(" · ")} · partial periods` : totals.join(" · ");
}

function normalizeCalendarGame(game: ScheduleGame, evidence: import("./results-types.js").StoredResultEvidence): StoredCalendarGridGame {
  const canonical = canonicalDivisionLabel(game.tag);
  return {
    game,
    time: game.localTime || "—",
    teams: `${game.team1.shortName} vs ${game.team2.shortName}`,
    score: game.scoreText || "—",
    division: canonical ?? (game.divisionLabel || game.tag),
    divisionTag: game.tag,
    quarterTotals: parseQuarterTotals(game.fullScore, evidence.periodState === "partial"),
    evidence,
  };
}

function createEmptyMonthMap(
  year: number,
  monthIndex: number,
  divisionTag: string,
  divisionLabel: string
): StoredResultsMonthMap {
  const map: StoredResultsMonthMap = {};
  for (const key of monthDayKeys(year, monthIndex)) {
    map[key] = [
      {
        date: key,
        division: divisionLabel,
        divisionTag,
        games: [],
      },
    ];
  }
  return map;
}

function formatApiDateFromIso(isoDate: string): string {
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const [, yyyy, mm, dd] = match;
  return `${dd}.${mm}.${yyyy}`;
}

async function fetchCalendarDay(tag: string, isoDate: string, signal: AbortSignal): Promise<ScheduleGame[]> {
  const dayStr = formatApiDateFromIso(isoDate);
  const params = new URLSearchParams({
    tag,
    from: dayStr,
    to: dayStr,
    lang: RESULTS_LANG,
  });
  const url = `${IPBL_API_BASE}/calendar?${params.toString()}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (response.ok) {
      const raw = (await response.json()) as unknown;
      return parseCalendarItems(raw, tag);
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
  throw new Error(`calendar failed ${dayStr}`);
}

export async function fetchScheduleGamesForDay(
  divisionTag: string,
  isoDate: string,
  opts: { timeoutMs?: number } = {}
): Promise<ScheduleGame[]> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchCalendarDay(divisionTag, isoDate, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch all calendar rows for one division in [year, monthIndex] (inclusive month).
 */
export async function fetchScheduleGamesForMonth(
  divisionTag: string,
  year: number,
  monthIndex: number,
  opts: { timeoutMs?: number } = {}
): Promise<ScheduleGame[]> {
  const all: ScheduleGame[] = [];
  for (const day of monthDayKeys(year, monthIndex)) {
    const batch = await fetchScheduleGamesForDay(divisionTag, day, { timeoutMs: opts.timeoutMs });
    all.push(...batch);
  }
  return all;
}

export function buildStoredMonthMap(
  games: ScheduleGame[],
  year: number,
  monthIndex: number,
  divisionTag: string,
  divisionLabel: string
): StoredResultsMonthMap {
  return buildStoredMonthMapWithStats(games, year, monthIndex, divisionTag, divisionLabel).map;
}

export function buildStoredMonthMapWithStats(
  games: ScheduleGame[],
  year: number,
  monthIndex: number,
  divisionTag: string,
  divisionLabel: string
): { map: StoredResultsMonthMap; stats: import("./results-hardening.js").BuildHardeningStats } {
  const tmp = createEmptyMonthMap(year, monthIndex, divisionTag, divisionLabel);
  const hardened = dedupeFinishedGames(games);
  for (const { game, evidence } of hardened.games) {
    const day = normalizeCalendarDate(game.localDate);
    const row = tmp[day];
    if (!row?.[0]) continue;
    row[0].games.push(normalizeCalendarGame(game, evidence));
  }
  for (const divisions of Object.values(tmp)) {
    for (const division of divisions) {
      division.games.sort((a, b) => a.time.localeCompare(b.time));
    }
  }
  return { map: tmp, stats: hardened.stats };
}
