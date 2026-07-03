import assert from "node:assert/strict";
import type { VercelResponse } from "@vercel/node";
import { createLiveCompatHandler } from "../api/live.ts";
import type { LiveFeedEnvelope } from "../lib/server/live-feed.ts";

const envelope: LiveFeedEnvelope = {
  games: [],
  status: {
    status: "OK",
    source: "official:api1.ipbl.pro",
  },
};

const handler = createLiveCompatHandler({
  buildLiveFeedEnvelope: async () => envelope,
});

const headers: Record<string, string> = {};
let statusCode = 0;
let payload: unknown = null;

const res = {
  setHeader(name: string, value: string) {
    headers[name] = value;
    return this;
  },
  status(code: number) {
    statusCode = code;
    return this;
  },
  json(body: unknown) {
    payload = body;
    return this;
  },
} as unknown as VercelResponse;

await handler({ method: "GET", query: {}, headers: {} } as never, res);

assert.equal(statusCode, 200);
assert.equal(headers["Cache-Control"], "no-store, max-age=0");
assert.equal(headers["CDN-Cache-Control"], "no-store");
assert.equal(headers["Vercel-CDN-Cache-Control"], "no-store");
assert.deepEqual(payload, {
  ...envelope,
  compatibilityEndpoint: "/api/live",
  source: "api/results/live",
});

console.log("live compatibility endpoint test passed");
