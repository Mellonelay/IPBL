import { normalizeCalendarRow, type ScheduleGame } from "./calendar-normalize.js";
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

export type OfficialCalendarEvidenceRow = {
  raw: Record<string, unknown>;
  game: ScheduleGame | null;
};

export type OfficialCalendarDayEvidence = {
  divisionTag: string;
  isoDate: string;
  fetchedAt: string;
  sourcePath: string;
  rows: OfficialCalendarEvidenceRow[];
};

function rawCalendarItems(raw: unknown): Record<string, unknown>[] {
  const items = (raw as { data?: { items?: unknown } })?.data?.items;
  return Array.isArray(items)
    ? items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

async function fetchCalendarDayEvidence(
  tag: string,
  isoDate: string,
  signal: AbortSignal
): Promise<OfficialCalendarDayEvidence> {
  const dayStr = formatApiDateFromIso(isoDate);
  const params = new URLSearchParams({ tag, from: dayStr, to: dayStr, lang: RESULTS_LANG });
  const sourcePath = `${IPBL_API_BASE}/calendar?${params.toString()}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(sourcePath, { headers: { Accept: "application/json" }, signal });
    if (response.ok) {
      const raw = (await response.json()) as unknown;
      const items = rawCalendarItems(raw);
      return {
        divisionTag: tag,
        isoDate,
        fetchedAt: new Date().toISOString(),
        sourcePath,
        rows: items.map((item) => ({ raw: item, game: normalizeCalendarRow(item, tag) })),
      };
    }
    const retriable = [502, 503, 504, 508].includes(response.status);
    if (!retriable || attempt === 2) {
      throw new Error(`calendar ${response.status} for ${dayStr} tag=${tag}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw new Error(`calendar failed ${dayStr}`);
}

export async function fetchOfficialCalendarEvidenceForDay(
  divisionTag: string,
  isoDate: string,
  opts: { timeoutMs?: number } = {}
): Promise<OfficialCalendarDayEvidence> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  try {
    return await fetchCalendarDayEvidence(divisionTag, isoDate, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchScheduleGamesForDay(
  divisionTag: string,
  isoDate: string,
  opts: { timeoutMs?: number } = {}
): Promise<ScheduleGame[]> {
  const evidence = await fetchOfficialCalendarEvidenceForDay(divisionTag, isoDate, opts);
  return evidence.rows.flatMap((row) => row.game ? [row.game] : []);
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
