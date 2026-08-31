import { safeCompare } from "../../lib/server/auth.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireResultsRedis } from "../../lib/server/results-redis.js";
import { buildLiveFeedEnvelope } from "../../lib/server/live-feed.js";
import { runMirrorProbe } from "../../lib/server/bookmaker-mirror-health.js";
import { isAuthorizedCronRequest, recordLiveEnvelope } from "../../lib/server/live-recorder.js";
import { buildRecorderHealthSnapshot } from "../../lib/server/recorder-health-snapshot.js";
import { isKvRestConfigured } from "../../lib/server/kv-rest-env-aliases.js";
import { resultsSyncSlots, SYNC_CURSOR_KEY } from "../../lib/server/results-sync-constants.js";
import { writeResultsMonthToKv } from "../../lib/server/write-results-month-kv.js";

function queryFromSearchParams(search: URLSearchParams): VercelRequest["query"] {
  const query: Record<string, string> = {};
  for (const [key, value] of search.entries()) {
    if (!(key in query)) query[key] = value;
  }
  return query;
}

async function runSyncResultsCron(req: VercelRequest, res: VercelResponse): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ error: "recorder_not_configured" });
    return;
  }
  if (!safeCompare(req.headers.authorization as string || "", `Bearer ${secret}`)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isKvRestConfigured()) {
    res.status(503).json({ ok: false, error: "KV not configured" });
    return;
  }

  try {
    const redis = requireResultsRedis();
    const slots = resultsSyncSlots();
    const prev = await redis.get<string>(SYNC_CURSOR_KEY);
    const cursor = prev ? Number.parseInt(prev, 10) : 0;
    const slot = slots[cursor % slots.length];
    const result = await writeResultsMonthToKv({
      year: slot.year,
      month: slot.month,
      divisionTag: slot.tag,
      timeoutMs: 115000,
    });

    await redis.set(SYNC_CURSOR_KEY, String(cursor + 1));
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const base = `https://${Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host || "ipbl-minimal-viewer.vercel.app"}`;
  const query = queryFromSearchParams(new URL(req.url || "/api/cron/record-live", base).searchParams);
  if (query.mode === "sync-results") {
    await runSyncResultsCron(req, res);
    return;
  }
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
