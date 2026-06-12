import assert from "node:assert/strict";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import { writeResultsMonthToKv } from "../lib/server/write-results-month-kv.ts";
import { resultsKvKey, resultsMetadataKey, resultsSyncSlots } from "../lib/server/results-sync-constants.ts";

class MemoryRedis {
  values = new Map<string, unknown>();
  writes: Array<{ key: string; value: unknown }> = [];
  async get<T>(key: string): Promise<T | null> { return (this.values.get(key) as T | undefined) ?? null; }
  async set(key: string, value: unknown): Promise<unknown> { this.values.set(key, value); this.writes.push({ key, value }); return "OK"; }
}

const team1 = { teamId: 1, shortName: "Alpha", name: "Alpha" };
const team2 = { teamId: 2, shortName: "Beta", name: "Beta" };
const game = (gameId: number, overrides: Partial<ScheduleGame> = {}): ScheduleGame => ({
  gameId,
  tag: "ipbl-66-m-pro-a",
  status: "ResultConfirmed",
  statusDisplay: "Finished",
  upstreamStatusId: "ResultConfirmed",
  score1: 80,
  score2: 70,
  scoreText: "80 : 70",
  fullScore: "20:20,20:15,20:20,20:15",
  localDate: "01.06.2026",
  localTime: `0${gameId}:00`,
  divisionLabel: "Pro Men A",
  period: null,
  timeToGo: null,
  timeIsGo: null,
  isLive: false,
  updatedAt: gameId,
  scheduledTime: `2026-06-01T0${gameId}:00:00+05:00`,
  team1,
  team2,
  ...overrides,
});

const redis = new MemoryRedis();
await assert.rejects(
  writeResultsMonthToKv(
    { year: 2026, month: 6, divisionTag: "ipbl-66-m-pro-g" },
    { redis, fetchMonth: async () => [], now: () => new Date("2026-06-12T00:00:00Z") }
  ),
  /disallowed division tag/
);
const first = await writeResultsMonthToKv(
  { year: 2026, month: 6, divisionTag: "ipbl-66-m-pro-a" },
  { redis, fetchMonth: async () => [game(1), game(2)], now: () => new Date("2026-06-12T00:00:00Z") }
);
assert.equal(first.gamesMerged, 2);
assert.equal(first.metadata.status, "ok");
assert.equal(first.metadata.verifiedThroughDate, "2026-06-12");

const second = await writeResultsMonthToKv(
  { year: 2026, month: 6, divisionTag: "ipbl-66-m-pro-a" },
  { redis, fetchMonth: async () => [game(2), game(3)], now: () => new Date("2026-06-12T00:05:00Z") }
);
assert.equal(second.gamesMerged, 3, "new sync must preserve game 1 while adding game 3");
const stored = JSON.parse(String(redis.values.get(resultsKvKey(2026, 6, "ipbl-66-m-pro-a"))));
assert.deepEqual(stored["2026-06-01"][0].games.map((row: any) => row.game.gameId), [1, 2, 3]);

const writesBeforeFailure = redis.writes.filter((write) => write.key === resultsKvKey(2026, 6, "ipbl-66-m-pro-a")).length;
await assert.rejects(
  writeResultsMonthToKv(
    { year: 2026, month: 6, divisionTag: "ipbl-66-m-pro-a" },
    { redis, fetchMonth: async () => { throw new Error("calendar 526"); }, now: () => new Date("2026-06-12T00:10:00Z") }
  ),
  /526/
);
const writesAfterFailure = redis.writes.filter((write) => write.key === resultsKvKey(2026, 6, "ipbl-66-m-pro-a")).length;
assert.equal(writesAfterFailure, writesBeforeFailure, "source failure must not overwrite the stored month");
const failureMeta = JSON.parse(String(redis.values.get(resultsMetadataKey(2026, 6, "ipbl-66-m-pro-a"))));
assert.equal(failureMeta.status, "source_unavailable");
assert.equal(failureMeta.verifiedThroughDate, "2026-06-12");

const slots = resultsSyncSlots(new Date("2026-06-12T00:00:00Z"));
assert.equal(slots.filter((slot) => slot.year === 2026 && slot.month === 6).length, 11);
assert.equal(slots.filter((slot) => slot.year === 2026 && slot.month === 5).length, 12);
assert.equal(slots.some((slot) => slot.month === 6 && slot.tag === "ipbl-66-m-pro-g"), false);
assert.equal(slots.some((slot) => slot.month === 5 && slot.tag === "ipbl-66-m-pro-g"), true);

console.log("Phase A Results writer fixture tests passed");
