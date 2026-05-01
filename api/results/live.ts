import type { VercelRequest, VercelResponse } from "@vercel/node";
import { RESULTS_SYNC_TAGS, IPBL_API_BASE, RESULTS_LANG } from "../admin/server-lib/results-sync-constants.js";
import { parseCalendarItems } from "../admin/server-lib/calendar-normalize.js";

/**
 * Aggregated live games for all approved IPBL divisions.
 * Returns both the games and a sanitized sync status model.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const startTime = Date.now();
    try {
        // Ensure no caching for live data
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        const allGames = [];
        const seenIds = new Set<number>();
        let fetchError = null;

        // Fetch all approved divisions in parallel
        const results = await Promise.all(
            RESULTS_SYNC_TAGS.map(async (tag) => {
                try {
                    const url = `${IPBL_API_BASE}/calendar/online?tag=${tag}&lang=${RESULTS_LANG}`;
                    const response = await fetch(url, { headers: { Accept: "application/json" } });
                    if (!response.ok) return { tag, error: response.status };
                    const raw = await response.json();
                    return { tag, games: parseCalendarItems(raw, tag).filter(g => g.isLive) };
                } catch (e: any) {
                    return { tag, error: e.message };
                }
            })
        );

        // Dedupe and flatten
        for (const res of results) {
            if ("error" in res) {
                fetchError = `Failed to fetch ${res.tag}: ${res.error}`;
                continue;
            }
            for (const game of res.games) {
                if (!seenIds.has(game.gameId)) {
                    allGames.push(game);
                    seenIds.add(game.gameId);
                }
            }
        }

        // Sanitized Status Model
        const status = {
            lastSyncAt: new Date().toISOString(),
            lastSuccessAt: fetchError ? undefined : new Date().toISOString(),
            status: fetchError ? "FAIL" : "OK",
            errorCode: fetchError ? "FETCH_PARTIAL_FAILURE" : undefined,
            latencyMs: Date.now() - startTime
        };

        return res.status(200).json({
            games: allGames,
            status
        });
    } catch (e: any) {
        return res.status(500).json({ 
            error: e.message,
            status: {
                lastSyncAt: new Date().toISOString(),
                status: "FAIL",
                errorCode: "INTERNAL_SERVER_ERROR"
            }
        });
    }
}
