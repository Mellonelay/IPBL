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
