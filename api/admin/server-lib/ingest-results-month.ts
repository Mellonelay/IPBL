import { parseCalendarItems, type ScheduleGame } from "./calendar-normalize.js";
import { IPBL_API_BASE, RESULTS_LANG } from "../../../lib/results-constants.js";
import { canonicalDivisionLabel } from "../../../src/config/divisions.js";

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

/** Same shape as client `CalendarGridMap` — JSON-serializable. */
export type StoredResultsMonthMap = Record<string, StoredCalendarGridDivision[]>;

function formatApiDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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

function parseQuarterTotals(fullScore: string | null): string | null {
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
    return totals.length > 0 ? totals.join(" · ") : null;
}

function normalizeCalendarGame(game: ScheduleGame): StoredCalendarGridGame {
    const canonical = canonicalDivisionLabel(game.tag);
    return {
        game,
        time: game.localTime || "—",
        teams: `${game.team1.shortName} vs ${game.team2.shortName}`,
        score: game.scoreText || "—",
        division: canonical ?? (game.divisionLabel || game.tag),
        divisionTag: game.tag,
        quarterTotals: parseQuarterTotals(game.fullScore),
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

async function fetchCalendarDay(tag: string, day: Date, signal: AbortSignal): Promise<ScheduleGame[]> {
    const dayStr = formatApiDate(day);
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

/**
 * Fetch all calendar rows for one division in [year, monthIndex] (inclusive month).
 */
export async function fetchScheduleGamesForMonth(
    divisionTag: string,
    year: number,
    monthIndex: number,
    opts: { timeoutMs?: number } = {}
): Promise<ScheduleGame[]> {
    const timeoutMs = opts.timeoutMs ?? 120_000;
    const start = startOfLocalDay(new Date(year, monthIndex, 1));
    const endExclusive = startOfLocalDay(new Date(year, monthIndex + 1, 1));
    const days: Date[] = [];
    for (let c = new Date(start); c < endExclusive; c.setDate(c.getDate() + 1)) {
        days.push(new Date(c));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const promises = days.map((day) => fetchCalendarDay(divisionTag, day, controller.signal));
        const batches = await Promise.all(promises);
        return batches.flat();
    } finally {
        clearTimeout(timer);
    }
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
