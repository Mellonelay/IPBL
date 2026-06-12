import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../lib/server/results-redis.js";
import { APPROVED_LIVE_TAGS, RECORDER_RETENTION, recorderKeys } from "../lib/server/live-recorder.js";

const approved = new Set<string>(APPROVED_LIVE_TAGS);

async function statusResponse(res: VercelResponse) {
  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "recorder_storage_not_configured" });
  const [status, activeGameKeys] = await Promise.all([
    redis.get(recorderKeys.status),
    redis.smembers(recorderKeys.active),
  ]);
  return res.status(200).json({ status: status ?? null, activeGameKeys });
}

async function historyResponse(req: VercelRequest, res: VercelResponse) {
  const division = typeof req.query.division === "string" ? req.query.division : "";
  const gameId = Number.parseInt(typeof req.query.gameId === "string" ? req.query.gameId : "", 10);
  const requestedLimit = Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "120", 10);
  if (!approved.has(division)) return res.status(400).json({ error: "invalid_division" });
  if (!Number.isInteger(gameId) || gameId <= 0) return res.status(400).json({ error: "invalid_game_id" });
  const limit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 120, 1), RECORDER_RETENTION);
  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "recorder_storage_not_configured" });
  const gameKey = `${division}:${gameId}`;
  const rows = await redis.lrange<string | Record<string, unknown>>(recorderKeys.gameTimeline(gameKey), 0, limit - 1);
  const snapshots = rows.flatMap((row) => {
    if (typeof row !== "string") return [row];
    try { return [JSON.parse(row) as Record<string, unknown>]; } catch { return []; }
  });
  return res.status(200).json({ gameKey, newestFirst: true, count: snapshots.length, snapshots });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const mode = typeof req.query.mode === "string" ? req.query.mode : "";
  if (mode === "status") return statusResponse(res);
  if (mode === "history") return historyResponse(req, res);
  return res.status(404).json({ error: "unknown_recorder_route" });
}
