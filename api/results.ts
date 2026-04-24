import { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { year, month, division } = req.query;
  if (!year || !month || !division) return res.status(400).json({ error: "Missing params" });
  const key = `ipbl:results:${year}:${month}:${division}`;
  try {
    const data = await redis.get(key);
    if (!data) return res.status(404).json({ error: "Cold data", key, cold: true });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Storage error" });
  }
}