import assert from "node:assert/strict";
import type { VercelResponse } from "@vercel/node";
import handler from "../api/analysis-engine.ts";
import { buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.ts";

const response = {
  statusCode: 0,
  body: null as unknown,
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

await handler({ method: "GET" } as never, response);

assert.equal(response.statusCode, 200);
assert.equal((response.body as { schema?: string }).schema, "ipbl.analysis-engine.v1");
assert.equal((response.body as { readOnly?: boolean }).readOnly, true);
assert.deepEqual(response.body, buildAnalysisEngineFromRepository());

