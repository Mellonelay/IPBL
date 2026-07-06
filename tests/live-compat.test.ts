import assert from "node:assert/strict";
import type { VercelResponse } from "@vercel/node";
import handler from "../api/results/live.ts";

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

await handler({ method: "GET", query: { compat: "1" }, headers: {} } as never, res);

assert.equal(statusCode, 200);
assert.equal(headers["Cache-Control"], "no-store, max-age=0");
assert.equal(headers["CDN-Cache-Control"], "no-store");
assert.equal(headers["Vercel-CDN-Cache-Control"], "no-store");
assert.equal((payload as { compatibilityEndpoint?: string }).compatibilityEndpoint, "/api/live");
assert.equal((payload as { source?: string }).source, "api/results/live");
assert.ok(Array.isArray((payload as { games?: unknown[] }).games));

console.log("live compatibility endpoint test passed");
