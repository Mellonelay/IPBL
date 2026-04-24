import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

/** Inlined from `lib/results-constants.ts` so this function bundles without `../lib/*` resolution issues on Vercel. */
const RESULTS_SYNC_TAGS = new Set([
  "ipbl-66-m-pro-a",
  "ipbl-66-m-pro-b",
  "ipbl-66-m-pro-c",
  "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g",
  "ipbl-66-m-pro-j",
  "ipbl-66-w-pro-a",
  "ipbl-66-w-pro-b",
  "ipbl-66-w-pro-c",
]);

function isApprovedResultsTag(tag: string): boolean {
  return RESULTS_SYNC_TAGS.has(tag);
}

function resultsKvKey(year: number, month1to12: number, divisionTag: string): string {
  const m = String(month1to12).padStart(2, "0");
  return `ipbl:results:${year}:${m}:${divisionTag}`;
}

function trimEnv(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t || undefined;
}

function applyKvRestEnvAliases(): void {
  const upUrl = trimEnv(process.env["UPSTASH_REDIS_REST_URL"]);
  const upTok = trimEnv(process.env["UPSTASH_REDIS_REST_TOKEN"]);
  const kvUrl = trimEnv(process.env["KV_REST_API_URL"]);
  const kvTok = trimEnv(process.env["KV_REST_API_TOKEN"]);
  if (!kvUrl && upUrl) process.env["KV_REST_API_URL"] = upUrl;
  if (!kvTok && upTok) process.env["KV_REST_API_TOKEN"] = upTok;
}

function isKvRestConfigured(): boolean {
  applyKvRestEnvAliases();
  return Boolean(trimEnv(process.env["KV_REST_API_URL"]) && trimEnv(process.env["KV_REST_API_TOKEN"]));
}

let redisSingleton: Redis | null | undefined;

function getResultsRedisClient(): Redis | null {
  applyKvRestEnvAliases();
  if (!isKvRestConfigured()) return null;
  if (redisSingleton === undefined) {
    const url = trimEnv(process.env["KV_REST_API_URL"]);
    const token = trimEnv(process.env["KV_REST_API_TOKEN"]);
    if (!url || !token) return null;
    redisSingleton = new Redis({ url, token });
  }
  return redisSingleton;
}

function parseMonth(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return n;
}

function parseYear(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return null;
  return n;
}

async function run(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const year = parseYear(typeof req.query.year === "string" ? req.query.year : undefined);
  const month = parseMonth(typeof req.query.month === "string" ? req.query.month : undefined);
  const division = typeof req.query.division === "string" ? req.query.division.trim() : "";

  if (year === null || month === null || !division) {
    res.status(400).json({ error: "Missing or invalid year, month, or division" });
    return;
  }
  if (!isApprovedResultsTag(division)) {
    res.status(400).json({ error: "Unknown division tag" });
    return;
  }

  if (!isKvRestConfigured()) {
    res.status(503).json({
      error:
        "KV/Redis REST is not configured. Set KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on this Vercel project.",
      code: "kv_env_missing",
    });
    return;
  }

  const key = resultsKvKey(year, month, division);
  const redis = getResultsRedisClient();
  if (!redis) {
    res.status(503).json({ error: "KV client unavailable", code: "kv_client_null" });
    return;
  }

  const raw = await redis.get(key);
  if (raw == null) {
    res.status(404).json({
      error:
        "No cached results yet for this month/division. Use POST /api/admin/backfill-results or wait for cron.",
      key,
      cold: true,
    });
    return;
  }

  let calendar: unknown;
  try {
    calendar = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    res.status(503).json({ error: "Cached results payload is corrupt JSON", key });
    return;
  }

  const meta = {
    source: "kv" as const,
    generatedAt: new Date().toISOString(),
    year,
    month,
    divisionTag: division,
    key,
  };
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=3600");
  res.status(200).json({ meta, calendar });
}

/** Vercel Node bundler + async `export default` was returning FUNCTION_INVOCATION_FAILED; return an explicit Promise instead. */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  return run(req, res).catch((e) => {
    const message = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      res.status(503).json({ error: message, code: "results_handler_error" });
    }
  });
}
