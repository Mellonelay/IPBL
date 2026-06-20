import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../../../lib/server/results-redis.js";
import { buildGameReplay } from "../../../lib/server/replay-engine.js";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const gameId = Number.parseInt(firstQueryValue(req.query.id) ?? "", 10);
  if (!Number.isInteger(gameId) || gameId <= 0) return res.status(400).json({ error: "invalid_game_id" });
  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "replay_storage_not_configured" });

  const replay = await buildGameReplay(redis, gameId);
  if (!replay.gameKey || replay.timeline.length === 0) return res.status(404).json({ error: "replay_not_found", gameId });

  res.setHeader("Cache-Control", "no-store, max-age=0");
  return res.status(200).json(replay);
}
