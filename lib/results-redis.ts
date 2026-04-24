import { Redis } from "@upstash/redis";
import { applyKvRestEnvAliases, isKvRestConfigured, trimEnv } from "./kv-env";

let cached: Redis | null | undefined = undefined;

/**
 * Upstash REST client (same backing store as deprecated @vercel/kv).
 * Reads `KV_REST_*` after `applyKvRestEnvAliases()` maps `UPSTASH_REDIS_REST_*`.
 */
export function getResultsRedis(): Redis | null {
  applyKvRestEnvAliases();
  if (!isKvRestConfigured()) {
    return null;
  }
  if (cached === undefined) {
    const url = trimEnv(process.env["KV_REST_API_URL"]);
    const token = trimEnv(process.env["KV_REST_API_TOKEN"]);
    if (!url || !token) {
      return null;
    }
    cached = new Redis({ url, token });
  }
  return cached;
}

export function requireResultsRedis(): Redis {
  const r = getResultsRedis();
  if (!r) {
    throw new Error(
      "KV/Redis REST is not configured (set KV_REST_API_URL + KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)"
    );
  }
  return r;
}
