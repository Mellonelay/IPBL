import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../../lib/server/results-redis.js";
import { recorderKeys } from "../../lib/server/live-recorder.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "recorder_storage_not_configured" });
  const [status, activeGameKeys] = await Promise.all([redis.get(recorderKeys.status), redis.smembers(recorderKeys.active)]);
  return res.status(200).json({ status: status ?? null, activeGameKeys });
}
