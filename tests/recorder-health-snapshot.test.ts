import assert from "node:assert/strict";

import { buildRecorderHealthSnapshot, type RecorderRedis } from "../lib/server/recorder-health-snapshot.ts";

class FakeRedis implements RecorderRedis {
  values = new Map<string, unknown>();
  lists = new Map<string, unknown[]>();
  sets = new Map<string, Set<string>>();
  async get<T>(key: string) { return (this.values.get(key) as T | undefined) ?? null; }
  async set(key: string, value: unknown) { this.values.set(key, value); return "OK"; }
  async lpush(key: string, value: unknown) { const list = this.lists.get(key) ?? []; list.unshift(value); this.lists.set(key, list); return list.length; }
  async ltrim(key: string, start: number, stop: number) { const list = this.lists.get(key) ?? []; this.lists.set(key, list.slice(start, stop + 1)); return "OK"; }
  async lrange<T>(key: string, start: number, stop: number) { return (this.lists.get(key) ?? []).slice(start, stop + 1) as T[]; }
  async sadd(key: string, ...members: string[]) { const set = this.sets.get(key) ?? new Set<string>(); members.forEach((member) => set.add(member)); this.sets.set(key, set); return members.length; }
  async srem(key: string, ...members: string[]) { const set = this.sets.get(key) ?? new Set<string>(); members.forEach((member) => set.delete(member)); return members.length; }
  async smembers(key: string) { return [...(this.sets.get(key) ?? new Set<string>())]; }
  async expire() { return 1; }
}

const redis = new FakeRedis();
const now = Date.parse("2026-07-04T04:24:13.000Z");

const status = {
  schemaVersion: 1,
  capturedAt: "2026-07-04T04:24:00.000Z",
  source: "bookmaker:melbet.com+1xbet.com",
  sourceStatus: "PARTIAL",
  receivedGames: 2,
  acceptedGames: 2,
  recordedSnapshots: 2,
  duplicateSnapshots: 0,
  rejectedGames: [],
  missingPreviouslyActive: [],
  activeGameKeys: ["ipbl-66-m-pro-a:733879359", "ipbl-66-w-pro-b:733879242"],
  sourceDetails: {
    lastSyncAt: "2026-07-04T04:24:13.000Z",
    source: "bookmaker:melbet.com+1xbet.com",
    status: "PARTIAL",
    fallbackFrom: "official:api1.ipbl.pro",
    requestedDivisions: 14,
    successfulDivisions: 2,
    bookmakerSourceLeagues: [2496666, 2496667],
    bookmakerSourceFailures: [],
    receivedBookmakerEvents: 6,
    unmatchedBookmakerEvents: [{ reason: "unverified-team" }],
    latencyMs: 1693,
    displayTimeZone: "Asia/Yangon",
  },
};

redis.values.set("ipbl:recorder:v1:status", status);
redis.values.set("ipbl:recorder:v1:runs", []);
redis.sets.set("ipbl:recorder:v1:active", new Set(status.activeGameKeys));
redis.lists.set("ipbl:recorder:v1:runs", [status]);

const snapshot = await buildRecorderHealthSnapshot(redis, now);

assert.equal(snapshot.health.level, "DEGRADED");
assert.equal(snapshot.health.source.reportedStatus, "PARTIAL");
assert.equal(snapshot.health.source.coverageRatio, 2 / 14);
assert.equal(snapshot.health.source.unmatchedEventCount, 1);
assert.equal(snapshot.health.source.bookmakerFailureCount, 0);
assert.equal(snapshot.health.alert.code, "source_degraded");
assert.deepEqual(snapshot.activeGameKeys, status.activeGameKeys);
assert.equal(snapshot.health.continuity.preservedActiveGameCount, 2);

console.log("Recorder health snapshot test passed");
