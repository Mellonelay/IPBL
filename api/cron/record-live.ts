import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
    });

    try {
        // Mocking capture for demonstration - real implementation would fetch from IPBL
        const timestamp = Date.now();
        const scoreSnapshot = { gameId: "live", score: "88:76", time: "Q3 04:12" };
        
        await redis.lpush("ipbl:timeline:live", JSON.stringify({ timestamp, ...scoreSnapshot }));
        await redis.ltrim("ipbl:timeline:live", 0, 100); // Keep last 100 minutes

        return res.status(200).json({ ok: true, message: "Snapshot recorded" });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}