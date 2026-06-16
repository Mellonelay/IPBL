import assert from "node:assert/strict";
import { mergeQuarterAndOddsTimeline, oddsHistoryKey, recordOddsSnapshot, type OddsRedis } from "../lib/server/odds-movement.ts";

class FakeRedis implements OddsRedis {
  values = new Map<string, unknown>();
  lists = new Map<string, unknown[]>();
  async get<T>(key: string) { return (this.values.get(key) as T | undefined) ?? null; }
  async set(key: string, value: unknown) { this.values.set(key, value); return "OK"; }
  async lpush(key: string, value: unknown) { const list = this.lists.get(key) ?? []; list.unshift(value); this.lists.set(key, list); return list.length; }
  async ltrim(key: string, start: number, stop: number) { const list = this.lists.get(key) ?? []; this.lists.set(key, list.slice(start, stop + 1)); return "OK"; }
  async lrange<T>(key: string, start: number, stop: number) { return (this.lists.get(key) ?? []).slice(start, stop + 1) as T[]; }
  async expire() { return 1; }
}

const redis = new FakeRedis();

const first = await recordOddsSnapshot(redis, {
  gameId: 728563609,
  quarter: 3,
  marketType: "over_under",
  line: 164.5,
  overOdds: 1.91,
  underOdds: 1.87,
  bookmaker: "melbet",
  marketStatus: "open",
  capturedAt: "2026-06-12T06:03:00.000Z",
});

const duplicate = await recordOddsSnapshot(redis, {
  gameId: 728563609,
  quarter: 3,
  marketType: "over_under",
  line: 164.5,
  overOdds: 1.91,
  underOdds: 1.87,
  bookmaker: "melbet",
  marketStatus: "open",
  capturedAt: "2026-06-12T06:04:00.000Z",
});

const second = await recordOddsSnapshot(redis, {
  gameId: 728563609,
  quarter: 3,
  marketType: "over_under",
  line: 165.5,
  overOdds: 1.88,
  underOdds: 1.9,
  bookmaker: "melbet",
  marketStatus: "open",
  capturedAt: "2026-06-12T06:05:00.000Z",
});

assert.equal(first.recorded, true);
assert.equal(duplicate.recorded, false);
assert.equal(second.recorded, true);

const oddsRows = await redis.lrange<Record<string, unknown>>(oddsHistoryKey(728563609), 0, 10);
assert.equal(oddsRows.length, 2);
const oddsSnapshots = oddsRows.map((row) => JSON.parse(String(row)) as Record<string, unknown>);
assert.equal(oddsSnapshots[0]?.quarter, 3);
assert.equal(oddsSnapshots[0]?.line, 165.5);
assert.equal(oddsSnapshots[0]?.capturedAt, "2026-06-12T06:05:00.000Z");
assert.equal(oddsSnapshots[1]?.line, 164.5);

const quarterTimeline = [
  { capturedAt: "2026-06-12T06:00:00.000Z", kind: "quarter", quarter: 3 },
];
const merged = mergeQuarterAndOddsTimeline(quarterTimeline, oddsSnapshots);
assert.deepEqual(merged.map((row) => row.kind), ["quarter", "odds", "odds"]);
assert.equal(merged[1]?.capturedAt, "2026-06-12T06:03:00.000Z");
assert.equal(merged[2]?.line, 165.5);

console.log("Odds movement engine tests passed");
