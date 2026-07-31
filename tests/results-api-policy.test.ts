import assert from "node:assert/strict";
import { metadataOnlyResultsEnvelope, setResultsCacheHeaders } from "../api/results.ts";

const unavailable = {
  schemaVersion: 1 as const,
  status: "source_unavailable" as const,
  source: "official:api1.ipbl.pro",
  checkedAt: "2026-06-12T00:00:00Z",
  updatedAt: null,
  verifiedThroughDate: null,
  year: 2026,
  month: 6,
  divisionTag: "ipbl-66-m-pro-a",
  error: "HTTP 526",
};

assert.deepEqual(metadataOnlyResultsEnvelope(unavailable, true), { calendar: {}, meta: unavailable });
assert.equal(metadataOnlyResultsEnvelope(unavailable, false), null, "legacy direct-map requests retain the cold-data response");
assert.equal(metadataOnlyResultsEnvelope({ schemaVersion: 1, status: "source_unavailable" }, true), null, "malformed metadata must not create a degraded envelope");
assert.equal(metadataOnlyResultsEnvelope({ ...unavailable, status: "ok" }, true), null, "metadata-only success without a calendar remains cold data");

const headers = new Map<string, string>();
const response = {
  setHeader(name: string, value: string | number | readonly string[]) {
    headers.set(name, String(value));
    return response;
  },
};
setResultsCacheHeaders(response as never);
assert.equal(headers.get("Cache-Control"), "public, max-age=60");
assert.equal(
  headers.get("Vercel-CDN-Cache-Control"),
  "public, s-maxage=900, stale-while-revalidate=86400, stale-if-error=86400",
);

console.log("Phase A Results API metadata and cache policy tests passed");
