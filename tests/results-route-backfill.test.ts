import assert from "node:assert/strict";
import type { VercelResponse } from "@vercel/node";
import { createResultsHandler } from "../api/results.ts";
import { resultsKvKey, resultsMetadataKey } from "../lib/server/results-sync-constants.ts";

class MemoryRedis {
  values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }
  async set(key: string, value: unknown): Promise<unknown> {
    this.values.set(key, value);
    return "OK";
  }
}

const redis = new MemoryRedis();
let writerCalls = 0;

const handler = createResultsHandler({
  getResultsRedis: () => redis as never,
  writeResultsMonthToKv: async ({ year, month, divisionTag }) => {
    writerCalls += 1;
    const key = resultsKvKey(year, month, divisionTag);
    const metadataKey = resultsMetadataKey(year, month, divisionTag);
    const calendar = {
      [`${year}-${String(month).padStart(2, "0")}-01`]: [
        {
          date: `${year}-${String(month).padStart(2, "0")}-01`,
          division: "Pro Men A",
          divisionTag,
          games: [
            {
              game: {
                gameId: 123,
                tag: divisionTag,
                status: "ResultConfirmed",
                statusDisplay: "Finished",
                upstreamStatusId: "ResultConfirmed",
                score1: 88,
                score2: 77,
                scoreText: "88 : 77",
                fullScore: "22:20,22:19,22:18,22:20",
                localDate: `${year}-${String(month).padStart(2, "0")}-01`,
                localTime: "08:00",
                divisionLabel: "Pro Men A",
                period: null,
                timeToGo: null,
                timeIsGo: null,
                isLive: false,
                updatedAt: 1,
                scheduledTime: `${year}-${String(month).padStart(2, "0")}-01T08:00:00+05:00`,
                sourceLocalDate: `${String(month).padStart(2, "0")}.01.${year}`,
                sourceLocalTime: "08:00",
                sourceTimeZone: "UTC+05:00",
                displayTimeZone: "Asia/Yangon",
                team1: { teamId: 1, shortName: "Alpha", name: "Alpha" },
                team2: { teamId: 2, shortName: "Beta", name: "Beta" },
              },
              time: "08:00",
              teams: "Alpha vs Beta",
              score: "88 : 77",
              division: "Pro Men A",
              divisionTag,
              quarterTotals: "Q1 42 · Q2 41 · Q3 40 · Q4 42",
              evidence: {
                periodCount: 4,
                periodState: "complete",
                scoreIntegrity: "consistent",
                quarterEvidenceQuarantined: false,
              },
            },
          ],
        },
      ],
    };
    const metadata = {
      schemaVersion: 1,
      status: "ok",
      source: "official:api1.ipbl.pro via worker",
      checkedAt: "2026-07-06T00:00:00Z",
      updatedAt: "2026-07-07T00:00:00Z",
      verifiedThroughDate: `${year}-${String(month).padStart(2, "0")}-07`,
      year,
      month,
      divisionTag,
      fetchedRows: 1,
      acceptedRows: 1,
      mergedRows: 1,
      preservedRows: 0,
      rejectedNonFinished: 0,
      duplicatesCollapsed: 0,
      partialPeriodRows: 0,
      quarantinedPeriodRows: 0,
    };
    await redis.set(key, JSON.stringify(calendar));
    await redis.set(metadataKey, JSON.stringify(metadata));
    return { key, metadataKey, divisionTag, metadata };
  },
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

await handler({
  method: "GET",
  url: "/api/results?year=2026&month=7&division=ipbl-66-m-pro-a&meta=1",
  headers: { host: "ipbl-minimal-viewer.vercel.app" },
  query: {},
} as never, res);

assert.equal(writerCalls, 1);
assert.equal(statusCode, 200);
assert.deepEqual(headers["Cache-Control"], "no-store, max-age=0");
assert.equal((payload as { meta?: { status?: string }; calendar?: Record<string, unknown> }).meta?.status, "ok");
assert.equal(Object.keys((payload as { calendar?: Record<string, unknown> }).calendar ?? {}).length, 1);
assert.ok(redis.values.has(resultsKvKey(2026, 7, "ipbl-66-m-pro-a")));

await redis.set(resultsMetadataKey(2026, 7, "ipbl-66-m-pro-a"), JSON.stringify({
  schemaVersion: 1,
  status: "ok",
  source: "official:api1.ipbl.pro via worker",
  checkedAt: "2026-07-06T00:00:00Z",
  updatedAt: "2026-07-06T00:00:00Z",
  verifiedThroughDate: "2026-07-03",
  year: 2026,
  month: 7,
  divisionTag: "ipbl-66-m-pro-a",
  fetchedRows: 1,
  acceptedRows: 1,
  mergedRows: 1,
  preservedRows: 0,
  rejectedNonFinished: 0,
  duplicatesCollapsed: 0,
  partialPeriodRows: 0,
  quarantinedPeriodRows: 0,
}));

await handler({
  method: "GET",
  url: "/api/results?year=2026&month=7&division=ipbl-66-m-pro-a&meta=1",
  headers: { host: "ipbl-minimal-viewer.vercel.app" },
  query: {},
} as never, res);

assert.equal(writerCalls, 2, "stale month metadata must trigger a repair pass");
assert.equal(statusCode, 200);
assert.equal((payload as { meta?: { verifiedThroughDate?: string } }).meta?.verifiedThroughDate, "2026-07-07");

console.log("Results route backfill test passed");
