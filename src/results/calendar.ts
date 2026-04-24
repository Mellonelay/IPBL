import type { ScheduleGame } from "../api/types";
import { DIVISIONS, type DivisionConfig } from "../config/divisions";
import { RESULTS_SYNC_TAGS } from "../../lib/results-constants";

export type CalendarGridGame = {
    game: ScheduleGame;
    time: string;
    teams: string;
    score: string;
    division: string;
    divisionTag: string;
    quarterTotals: string | null;
};

export type CalendarGridDivision = {
    date: string; // YYYY-MM-DD
    division: string;
    divisionTag: string;
    games: CalendarGridGame[];
};

export type CalendarGridMap = Record<string, CalendarGridDivision[]>;

/** Same tag list as server-side sync (see `lib/results-constants.ts`). */
export const RESULTS_DIVISION_TAGS = RESULTS_SYNC_TAGS;

export const RESULTS_DIVISIONS: DivisionConfig[] = DIVISIONS.filter((config) =>
    (RESULTS_SYNC_TAGS as readonly string[]).includes(config.tag)
);

const SESSION_CACHE_TTL_MS = 60_000;
const sessionCache = new Map<string, { at: number; map: CalendarGridMap }>();
const inflight = new Map<string, Promise<CalendarGridMap>>();

function isoDate(day: Date): string {
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
        day.getDate()
    ).padStart(2, "0")}`;
}

function monthDayKeys(year: number, monthIndex: number): string[] {
    const count = new Date(year, monthIndex + 1, 0).getDate();
    const out: string[] = [];
    for (let day = 1; day <= count; day += 1) {
        out.push(isoDate(new Date(year, monthIndex, day)));
    }
    return out;
}

function sessionKey(year: number, monthIndex: number, divisionTag: string): string {
    return `${year}-${monthIndex + 1}|${divisionTag}`;
}

function cloneCalendarMap(map: CalendarGridMap): CalendarGridMap {
    return Object.fromEntries(
        Object.entries(map).map(([day, divisions]) => [
            day,
            divisions.map((division) => ({
                ...division,
                games: [...division.games],
            })),
        ])
    );
}

function buildDivisionConfigs(divisionTags: string[]): DivisionConfig[] {
    const set = new Set(divisionTags);
    return RESULTS_DIVISIONS.filter((d) => set.has(d.tag));
}

function createEmptyMonthMap(
    year: number,
    monthIndex: number,
    divisions: DivisionConfig[]
): CalendarGridMap {
    const map: CalendarGridMap = {};
    const dayKeys = monthDayKeys(year, monthIndex);
    dayKeys.forEach((key) => {
        map[key] = divisions.map((division) => ({
            date: key,
            division: division.label,
            divisionTag: division.tag,
            games: [] as CalendarGridGame[],
        }));
    });
    return map;
}

/** Reject truncated maps (e.g. only first N days). */
export function isCalendarMapCompleteForMonth(
    map: CalendarGridMap | null | undefined,
    year: number,
    monthIndex: number,
    divisionTags: string[]
): boolean {
    if (!map) return false;
    const expectedKeys = monthDayKeys(year, monthIndex);
    const keys = Object.keys(map).sort();
    if (keys.length !== expectedKeys.length) return false;
    for (let i = 0; i < expectedKeys.length; i += 1) {
        if (keys[i] !== expectedKeys[i]) return false;
    }
    const configs = buildDivisionConfigs(divisionTags);
    if (configs.length === 0) return false;
    for (const day of expectedKeys) {
        const row = map[day];
        if (!row || row.length !== configs.length) return false;
        for (let i = 0; i < configs.length; i += 1) {
            if (row[i].divisionTag !== configs[i].tag || row[i].date !== day) return false;
        }
    }
    return true;
}

/** Full-month placeholder grid (single division typical). */
export function createSkeletonResultsCalendarMap(
    year: number,
    monthIndex: number,
    divisionTags: string[]
): CalendarGridMap {
    const divisions = buildDivisionConfigs(divisionTags);
    if (divisions.length === 0) return {};
    return createEmptyMonthMap(year, monthIndex, divisions);
}

export function clearResultsCalendarCache(): void {
    sessionCache.clear();
    inflight.clear();
}

/**
 * Load precomputed month from Vercel KV via `/api/results` (never calls ipbl.pro from the browser).
 */
export async function fetchResultsMonthFromApi(params: {
    year: number;
    monthIndex: number;
    divisionTag: string;
}): Promise<CalendarGridMap> {
    const { year, monthIndex, divisionTag } = params;
    const key = sessionKey(year, monthIndex, divisionTag);
    const now = Date.now();
    const hit = sessionCache.get(key);
    if (hit && now - hit.at < SESSION_CACHE_TTL_MS) {
        return cloneCalendarMap(hit.map);
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
        const month = monthIndex + 1;
        const url = `/api/results?year=${year}&month=${month}&division=${encodeURIComponent(divisionTag)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const rawText = await res.text();
        if (!res.ok) {
            let msg = res.statusText || `HTTP ${res.status}`;
            try {
                const body = JSON.parse(rawText) as { error?: unknown };
                if (body.error != null) {
                    msg =
                        typeof body.error === "string"
                            ? body.error
                            : typeof body.error === "object"
                                ? JSON.stringify(body.error)
                                : String(body.error);
                }
            } catch {
                if (rawText.trim()) msg = rawText.trim().slice(0, 500);
            }
            throw new Error(msg);
        }
        let bodyUnknown: unknown;
        try {
            bodyUnknown = JSON.parse(rawText) as unknown;
        } catch {
            throw new Error("Invalid JSON from /api/results");
        }
        let map: CalendarGridMap;
        if (
            bodyUnknown &&
            typeof bodyUnknown === "object" &&
            "calendar" in bodyUnknown &&
            (bodyUnknown as { calendar?: unknown }).calendar &&
            typeof (bodyUnknown as { calendar: unknown }).calendar === "object"
        ) {
            map = (bodyUnknown as { calendar: CalendarGridMap }).calendar;
        } else {
            map = bodyUnknown as CalendarGridMap;
        }
        sessionCache.set(key, { at: Date.now(), map });
        return cloneCalendarMap(map);
    })();

    inflight.set(key, promise);
    try {
        return await promise;
    } finally {
        inflight.delete(key);
    }
}
