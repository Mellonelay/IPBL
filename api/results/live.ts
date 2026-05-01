import type { VercelRequest, VercelResponse } from "@vercel/node";
import { RESULTS_SYNC_TAGS, IPBL_API_BASE, RESULTS_LANG } from "../admin/server-lib/results-sync-constants.js";
import { parseCalendarItems } from "../admin/server-lib/calendar-normalize.js";

/**
 * Aggregated live games for all approved IPBL divisions.
 * This function performs parallel fetching on the backend to avoid frontend request loops.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        // Ensure no caching for live data
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        const allGames = [];
        const seenIds = new Set<number>();

        // Fetch all approved divisions in parallel
        const results = await Promise.all(
            RESULTS_SYNC_TAGS.map(async (tag) => {
                try {
                    const url = `${IPBL_API_BASE}/calendar/online?tag=${tag}&lang=${RESULTS_LANG}`;
                    const response = await fetch(url, { headers: { Accept: "application/json" } });
                    if (!response.ok) return [];
                    const raw = await response.json();
                    return parseCalendarItems(raw, tag).filter(g => g.isLive);
                } catch {
                    return [];
                }
            })
        );

        // Dedupe and flatten into a single array of ScheduleGame
        for (const games of results) {
            for (const game of games) {
                if (!seenIds.has(game.gameId)) {
                    allGames.push(game);
                    seenIds.add(game.gameId);
                }
            }
        }

        // Return the clean array directly
        return res.status(200).json(allGames);
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
