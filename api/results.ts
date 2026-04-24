import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as redis from "./admin/server-lib/results-redis.js";
import * as syncConstants from "./admin/server-lib/results-sync-constants.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { year, month, division } = req.query;
    if (!year || !month || !division) return res.status(400).json({ error: "Missing params" });
    
    const key = syncConstants.resultsKvKey(Number(year), Number(month), String(division));
    try {
        const client = redis.getResultsRedis();
        if (!client) return res.status(503).json({ error: "KV not configured" });
        
        const data = await client.get<string>(key);
        if (!data) return res.status(404).json({ error: "Cold data", key, cold: true });
        
        return res.status(200).json(data);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: message });
    }
}