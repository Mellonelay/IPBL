import { parseCalendarItems } from "../src/api/normalize";
import { DIVISIONS } from "../src/config/divisions";

type CalendarScriptGame = {
    time: string;
    teams: string;
    score: string;
    quarterTotals: string | null;
};

type CalendarScriptEntry = {
    date: string;
    division: string;
    games: CalendarScriptGame[];
};

export type ResultsCalendarMap = Record<string, CalendarScriptEntry[]>;

const MARCH_START = new Date("2026-03-01T00:00:00Z");
const MARCH_END = new Date("2026-03-31T00:00:00Z");
const INCLUDED_TAGS = new Set([
    "ipbl-66-m-pro-a",
    "ipbl-66-m-pro-b",
    "ipbl-66-m-pro-c",
    "ipbl-66-m-pro-d",
    "ipbl-66-m-pro-g",
    "ipbl-66-m-pro-j",
    "ipbl-66-w-pro-a",
    "ipbl-66-w-pro-b",
    "ipbl-66-w-pro-c",
]);

function formatApiDate(day: Date): string {
    const dd = String(day.getUTCDate()).padStart(2, "0");
    const mm = String(day.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = day.getUTCFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function formatIsoDate(day: Date): string {
    const dd = String(day.getUTCDate()).padStart(2, "0");
    const mm = String(day.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = day.getUTCFullYear();
    return `${yyyy}-${mm}-${dd}`;
}

function quarterTotals(fullScore: string | null): string | null {
    if (!fullScore) return null;
    const totals = fullScore
        .split(",")
        .map((part) => part.trim())
        .map((part, index) => {
            const values = part
                .split(":")
                .map((chunk) => Number.parseInt(chunk.trim(), 10))
                .filter((value) => Number.isFinite(value));
            return values.length === 2 ? `Q${index + 1} ${values[0] + values[1]}` : null;
        })
        .filter((value): value is string => Boolean(value));

    return totals.length > 0 ? totals.join(" · ") : null;
}

export async function fetchResultsCalendar(baseUrl = "/api/ipbl"): Promise<ResultsCalendarMap> {
    const divisions = DIVISIONS.filter((division) => INCLUDED_TAGS.has(division.tag));
    const calendar: ResultsCalendarMap = {};

    for (
        let cursor = new Date(MARCH_START);
        cursor.getTime() <= MARCH_END.getTime();
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
        const dateKey = formatIsoDate(cursor);
        const from = formatApiDate(cursor);
        const divisionsForDay = await Promise.all(
            divisions.map(async (division) => {
                const response = await fetch(
                    `${baseUrl}/calendar?tag=${division.tag}&from=${from}&to=${from}&lang=ru`
                );
                const raw = await response.json();
                const games = parseCalendarItems(raw, division.tag).map((game) => ({
                    time: game.localTime,
                    teams: `${game.team1.shortName} vs ${game.team2.shortName}`,
                    score: game.scoreText,
                    quarterTotals: quarterTotals(game.fullScore),
                }));

                return {
                    date: dateKey,
                    division: division.label,
                    games,
                };
            })
        );

        calendar[dateKey] = divisionsForDay;
    }

    return calendar;
}
