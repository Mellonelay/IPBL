import { LANG } from "../config/divisions";
import { dedupeLiveGames, parseCalendarItems, parseTeamHistory } from "./normalize";
import type { BoxScoreState, GameDetail, ScheduleGame, TeamHistoryGame } from "./types";

const calCache = new Map<string, { at: number; rows: ScheduleGame[] }>();
const teamCache = new Map<string, { at: number; rows: TeamHistoryGame[] }>();
const CAL_TTL_MS = 90_000;
const TEAM_TTL_MS = 300_000;

function base(): string {
    return "/api/ipbl";
}

function q(obj: Record<string, string | number | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== "") p.set(k, String(v));
    }
    return p.toString();
}

async function getJson(path: string, search: string): Promise<unknown> {
    const url = `${base()}${path}${search ? `?${search}` : ""}`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
        const r = await fetch(url, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
        });
        if (!r.ok) throw new Error(`${r.status} ${path}`);
        return r.json();
    } finally {
        window.clearTimeout(timeout);
    }
}

export function formatApiDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

export function seasonFromDate(d: Date): number {
    return d.getFullYear();
}

export async function fetchSchedule(tag: string, day: Date): Promise<ScheduleGame[]> {
    const key = `${tag}|${formatApiDate(day)}`;
    const hit = calCache.get(key);
    const now = Date.now();
    if (hit && now - hit.at < CAL_TTL_MS) return hit.rows;
    const from = formatApiDate(day);
    const raw = await getJson("/calendar", q({ tag, from, to: from, lang: LANG }));
    const rows = parseCalendarItems(raw, tag);
    calCache.set(key, { at: now, rows });
    return rows;
}

export async function fetchOnline(tag: string): Promise<ScheduleGame[]> {
    const raw = await getJson("/calendar/online", q({ tag, lang: LANG }));
    const rows = dedupeLiveGames(parseCalendarItems(raw, tag).filter((row) => row.isLive));
    return rows;
}

export async function fetchGame(gameId: number, tag: string): Promise<GameDetail> {
    try {
        const raw = await getJson("/games/game", q({ id: gameId, tag, lang: LANG }));
        return { raw, fetchedOk: true };
    } catch {
        return { raw: null, fetchedOk: false };
    }
}

export async function fetchBoxScore(gameId: number, tag: string): Promise<BoxScoreState> {
    const t = Date.now();
    try {
        const raw = await getJson("/box-score", q({ id: gameId, tag, lang: LANG }));
        const data = raw as { data?: { status?: string } };
        const st = data?.data?.status ?? null;
        const fetchedOk = st === "Ok";
        return { raw, apiStatus: st, fetchedOk, fetchedAt: t };
    } catch {
        return { raw: null, apiStatus: null, fetchedOk: false, fetchedAt: t };
    }
}

export async function fetchTeamGames(
    teamId: number,
    tag: string,
    season: number
): Promise<TeamHistoryGame[]> {
    const key = `${teamId}|${tag}|${season}`;
    const hit = teamCache.get(key);
    const now = Date.now();
    if (hit && now - hit.at < TEAM_TTL_MS) return hit.rows;
    const raw = await getJson("/team/games", q({ teamId, calendarType: 1, tag, season }));
    const rows = parseTeamHistory(raw, tag);
    teamCache.set(key, { at: now, rows });
    return rows;
}

export function clearFetchCaches(): void {
    calCache.clear();
    teamCache.clear();
}
