import assert from "node:assert/strict";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import { recordLiveEnvelope, type RecorderRedis } from "../lib/server/live-recorder.ts";
import { recordOddsSnapshot, type OddsRedis } from "../lib/server/odds-movement.ts";
import { buildGameReplay } from "../lib/server/replay-engine.ts";

class FakeRedis implements RecorderRedis, OddsRedis {
  values = new Map<string, unknown>();
  lists = new Map<string, unknown[]>();
  sets = new Map<string, Set<string>>();
  async get<T>(key: string) { return (this.values.get(key) as T | undefined) ?? null; }
  async set(key: string, value: unknown) { this.values.set(key, value); return "OK"; }
  async lpush(key: string, value: unknown) { const list = this.lists.get(key) ?? []; list.unshift(value); this.lists.set(key, list); return list.length; }
  async ltrim(key: string, start: number, stop: number) { const list = this.lists.get(key) ?? []; this.lists.set(key, list.slice(start, stop + 1)); return "OK"; }
  async lrange<T>(key: string, start: number, stop: number) { return (this.lists.get(key) ?? []).slice(start, stop + 1) as T[]; }
  async sadd(key: string, ...members: string[]) { const set = this.sets.get(key) ?? new Set<string>(); members.forEach((value) => set.add(value)); this.sets.set(key, set); return members.length; }
  async srem(key: string, ...members: string[]) { const set = this.sets.get(key) ?? new Set<string>(); members.forEach((value) => set.delete(value)); return members.length; }
  async smembers(key: string) { return [...(this.sets.get(key) ?? new Set<string>())]; }
  async expire() { return 1; }
}

const redis = new FakeRedis();
const game: ScheduleGame = {
  gameId: 728563612,
  tag: "ipbl-66-m-pro-b",
  status: "Online",
  statusDisplay: "Live",
  upstreamStatusId: "Online",
  score1: 14,
  score2: 10,
  scoreText: "14 : 10",
  fullScore: "14:10",
  localDate: "12.06.2026",
  localTime: "12:15",
  divisionLabel: "Pro Men B",
  period: 1,
  timeToGo: "09:59",
  timeIsGo: 1,
  isLive: true,
  updatedAt: 1781241300000,
  scheduledTime: "2026-06-12T12:15:00+05:00",
  displayTimeZone: "Asia/Yangon",
  team1: { teamId: 76049, shortName: "Samara", name: "Samara" },
  team2: { teamId: 76050, shortName: "Krasnodar", name: "Krasnodar" },
};

await recordLiveEnvelope(redis, { games: [game], status: { source: "official:api1.ipbl.pro", status: "OK", lastSyncAt: "2026-06-12T06:00:00.000Z" } }, Date.parse("2026-06-12T06:00:00.000Z"));
await recordLiveEnvelope(redis, { games: [{ ...game, period: 2, timeToGo: "08:20", score1: 27, scoreText: "27 : 10" }], status: { source: "official:api1.ipbl.pro", status: "OK", lastSyncAt: "2026-06-12T06:03:00.000Z" } }, Date.parse("2026-06-12T06:03:00.000Z"));
await recordOddsSnapshot(redis, {
  gameId: 728563612,
  quarter: 1,
  marketType: "over_under",
  line: 41.5,
  overOdds: 1.93,
  underOdds: 1.85,
  bookmaker: "melbet",
  marketStatus: "open",
  capturedAt: "2026-06-12T06:02:00.000Z",
});
await recordOddsSnapshot(redis, {
  gameId: 728563612,
  quarter: 2,
  marketType: "over_under",
  line: 43.5,
  overOdds: 1.89,
  underOdds: 1.89,
  bookmaker: "melbet",
  marketStatus: "open",
  capturedAt: "2026-06-12T06:04:00.000Z",
});

const replay = await buildGameReplay(redis, 728563612);
assert.equal(replay.gameId, 728563612);
assert.equal(replay.timeline.length, 5);
assert.deepEqual(replay.timeline.map((event) => event.kind), ["quarter", "odds", "quarter", "result", "odds"]);
assert.deepEqual(
  replay.timeline.filter((event) => event.kind === "quarter").map((event) => event.quarter),
  [1, 2],
);
assert.equal(replay.timeline.find((event) => event.kind === "result")?.scoreText, "27 : 10");

console.log("Replay engine tests passed");
