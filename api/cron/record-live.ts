import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireResultsRedis } from "../../lib/server/results-redis.js";
import { buildLiveFeedEnvelope } from "../../lib/server/live-feed.js";
import { runMirrorProbe } from "../../lib/server/bookmaker-mirror-health.js";
import { isAuthorizedCronRequest, recordLiveEnvelope } from "../../lib/server/live-recorder.js";
import { buildRecorderHealthSnapshot } from "../../lib/server/recorder-health-snapshot.js";


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "recorder_not_configured" });
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
  if (!isAuthorizedCronRequest(authorization, secret)) return res.status(401).json({ error: "unauthorized" });

  try {
    const envelope = await buildLiveFeedEnvelope();
    const redis = requireResultsRedis();
    const run = await recordLiveEnvelope(redis, envelope);
    const healthSnapshot = await buildRecorderHealthSnapshot(redis);
    const mirrorProbe = await runMirrorProbe();
    const sourceStatus = healthSnapshot.health.source.reportedStatus ?? null;
    return res.status(200).json({
      ok: healthSnapshot.health.level !== "FAILED",
      run,
      sourceStatus,
      activeGameKeys: healthSnapshot.activeGameKeys,
      health: healthSnapshot.health,
      mirrorProbe,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}
