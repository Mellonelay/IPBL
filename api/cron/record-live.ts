import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireResultsRedis } from "../../lib/server/results-redis.js";
import { isAuthorizedCronRequest, recordLiveEnvelope, type LiveFeedEnvelope } from "../../lib/server/live-recorder.js";

function requestBase(req: VercelRequest): string {
  const configured = process.env.RECORDER_LIVE_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "ipbl-minimal-viewer.vercel.app");
  const protocol = String(req.headers["x-forwarded-proto"] ?? "https");
  return `${protocol}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "recorder_not_configured" });
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
  if (!isAuthorizedCronRequest(authorization, secret)) return res.status(401).json({ error: "unauthorized" });

  try {
    const liveUrl = `${requestBase(req)}/api/results/live?recorder=${Date.now()}`;
    const liveResponse = await fetch(liveUrl, { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(25_000) });
    if (!liveResponse.ok) throw new Error(`Live feed HTTP ${liveResponse.status}`);
    const envelope = await liveResponse.json() as LiveFeedEnvelope;
    const run = await recordLiveEnvelope(requireResultsRedis(), envelope);
    return res.status(200).json({ ok: true, run });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
