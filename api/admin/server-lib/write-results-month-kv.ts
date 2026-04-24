import { buildStoredMonthMap, fetchScheduleGamesForMonth } from "./ingest-results-month.js";
import { requireResultsRedis } from "./results-redis.js";
import { isApprovedResultsTag, resultsKvKey } from "../../../lib/results-constants.js";
import { DIVISION_LABEL_BY_TAG } from "../../../src/config/divisions.js";

/**
 * Fetch one division × one calendar month from ipbl.pro and write `ipbl:results:{year}:{MM}:{tag}`.
 */
export async function writeResultsMonthToKv(params: {
    year: number;
    /** 1–12 */
    month: number;
    divisionTag: string;
    timeoutMs?: number;
}): Promise<{ key: string; gamesIngested: number; divisionTag: string }> {
    const { year, month, divisionTag } = params;
    if (!isApprovedResultsTag(divisionTag)) {
        throw new Error(`Unknown or disallowed division tag: ${divisionTag}`);
    }
    const label = DIVISION_LABEL_BY_TAG[divisionTag] ?? divisionTag;
    const timeoutMs = params.timeoutMs ?? Number.parseInt(process.env.SYNC_MONTH_TIMEOUT_MS ?? "115000", 10);
    const games = await fetchScheduleGamesForMonth(divisionTag, year, month - 1, { timeoutMs });
    const map = buildStoredMonthMap(games, year, month - 1, divisionTag, label);
    const key = resultsKvKey(year, month, divisionTag);
    await requireResultsRedis().set(key, JSON.stringify(map));
    return { key, gamesIngested: games.length, divisionTag };
}
