import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireResultsRedis } from "../../lib/server/results-redis.js";
import { isAuthorizedCronRequest, recordLiveEnvelope } from "../../lib/server/live-recorder.js";
import { buildLiveFeedEnvelope } from "../results/live.js";

function sourceStatusText(status: unknown): string | null {
  if (!status || typeof status !== "object") return null;
  const value = (status as { status?: unknown }).status;
  return typeof value === "string" ? value : null;
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "recorder_not_configured" });
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
  if (!isAuthorizedCronRequest(authorization, secret)) return res.status(401).json({ error: "unauthorized" });

  try {
    const envelope = await buildLiveFeedEnvelope();
    const run = await recordLiveEnvelope(requireResultsRedis(), envelope);
    const sourceStatus = sourceStatusText(envelope.status);
    return res.status(200).json({ ok: sourceStatus !== "FAIL", run, sourceStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}
