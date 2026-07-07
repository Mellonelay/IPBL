import assert from "node:assert/strict";
import type { VercelResponse } from "@vercel/node";
import handler from "../api/gen-analysis.ts";
import { buildOperatorIntelligenceReport } from "../lib/server/operator-intelligence.ts";

const response = {
  statusCode: 0,
  body: null as unknown,
  setHeader() {
    return this;
  },
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: unknown) {
    this.body = body;
    return this;
  },
} as unknown as VercelResponse & {
  statusCode: number;
  body: unknown;
};

await handler({ method: "GET", headers: {}, query: {} } as never, response);

assert.equal(response.statusCode, 200);
assert.equal((response.body as { operatorIntelligence?: { schema?: string } }).operatorIntelligence?.schema, "ipbl.operator-intelligence.v1");
assert.deepEqual((response.body as { operatorIntelligence?: unknown }).operatorIntelligence, buildOperatorIntelligenceReport());
