import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getResultsRedis } from "../lib/server/results-redis.js";
import { APPROVED_LIVE_TAGS, RECORDER_RETENTION, recorderKeys } from "../lib/server/live-recorder.js";
import { buildGameReplay } from "../lib/server/replay-engine.js";
import { evaluateRecorderHealth, SOURCE_HEALTH_POLICY } from "../lib/server/source-health.js";

const approved = new Set<string>(APPROVED_LIVE_TAGS);

type RecorderDependencies = {
  getResultsRedis?: typeof getResultsRedis;
  buildGameReplay?: typeof buildGameReplay;
};

function requestSearchParams(req: VercelRequest): URLSearchParams {
  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const base = `https://${host || "ipbl-minimal-viewer.vercel.app"}`;
  return new URL(req.url || "/api/recorder", base).searchParams;
}

async function statusResponse(res: VercelResponse) {
  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "recorder_storage_not_configured" });
  const [status, activeGameKeys] = await Promise.all([
    redis.get(recorderKeys.status),
    redis.smembers(recorderKeys.active),
  ]);
  return res.status(200).json({ status: status ?? null, activeGameKeys });
}

async function healthResponse(res: VercelResponse) {
  const redis = getResultsRedis();
  if (!redis) return res.status(503).json({ error: "recorder_storage_not_configured" });
  const [status, activeGameKeys, runRows] = await Promise.all([
    redis.get(recorderKeys.status),
    redis.smembers(recorderKeys.active),
    redis.lrange(recorderKeys.runs, 0, SOURCE_HEALTH_POLICY.recentRunWindow - 1),
  ]);
  const health = evaluateRecorderHealth(status, runRows, Date.now(), activeGameKeys);
  return res.status(200).json({ health, activeGameKeys });
}

async function historyResponse(search: URLSearchParams, res: VercelResponse) {
  const division = search.get("division") ?? "";
  const gameId = Number.parseInt(search.get("gameId") ?? "", 10);
  const requestedLimit = Number.parseInt(search.get("limit") ?? "120", 10);
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

export async function replayResponse(search: URLSearchParams, res: VercelResponse, deps: RecorderDependencies = {}) {
  const gameId = Number.parseInt(search.get("gameId") ?? "", 10);
  if (!Number.isInteger(gameId) || gameId <= 0) return res.status(400).json({ error: "invalid_game_id" });
  const getRedis = deps.getResultsRedis ?? getResultsRedis;
  const buildReplay = deps.buildGameReplay ?? buildGameReplay;
  const redis = getRedis();
  if (!redis) return res.status(503).json({ error: "replay_storage_not_configured" });
  const replay = await buildReplay(redis, gameId);
  if (!replay.gameKey || replay.timeline.length === 0) return res.status(404).json({ error: "replay_not_found", gameId });
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  return res.status(200).json(replay);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const search = requestSearchParams(req);
  const mode = search.get("mode") ?? "";
  if (mode === "status") return statusResponse(res);
  if (mode === "history") return historyResponse(search, res);
  if (mode === "health") return healthResponse(res);
  if (mode === "replay") return replayResponse(search, res);
  return res.status(404).json({ error: "unknown_recorder_route" });
}
