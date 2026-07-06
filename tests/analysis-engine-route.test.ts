import assert from "node:assert/strict";
import type { VercelResponse } from "@vercel/node";
import handler from "../api/gen-analysis.ts";
import { buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.ts";

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
assert.equal((response.body as { analysisEngine?: { schema?: string } }).analysisEngine?.schema, "ipbl.analysis-engine.v1");
assert.deepEqual((response.body as { analysisEngine?: unknown }).analysisEngine, buildAnalysisEngineFromRepository());
