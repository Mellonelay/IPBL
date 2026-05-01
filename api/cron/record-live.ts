import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
    });

    try {
        // Fetch real live data from the proxy
        const liveRes = await fetch("https://api.ipbl.pro/calendar/online?tag=/api/results/live&lang=ru");
        const raw = await liveRes.json();
        
        const timestamp = Date.now();
        // Just recording the raw count and timestamp for this milestone
        const snapshot = { timestamp, count: (raw as any)?.data?.length || 0, data: raw };
        
        await redis.lpush("ipbl:timeline:live", JSON.stringify(snapshot));
        await redis.ltrim("ipbl:timeline:live", 0, 1440); // Keep last 24 hours of minute-by-minute data

        return res.status(200).json({ ok: true, recorded: snapshot.count });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}