import assert from "node:assert/strict";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import { recordLiveEnvelope, recorderKeys, type RecorderRedis } from "../lib/server/live-recorder.ts";

class FakeRedis implements RecorderRedis {
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

const baseGame: ScheduleGame = {
  gameId: 728563610,
  tag: "ipbl-66-w-pro-b",
  status: "Online",
  statusDisplay: "Live",
  upstreamStatusId: "Online",
  score1: 10,
  score2: 12,
  scoreText: "10 : 12",
  fullScore: "10:12",
  localDate: "12.06.2026",
  localTime: "12:15",
  divisionLabel: "Pro Women B",
  period: 1,
  timeToGo: "09:59",
  timeIsGo: 1,
  isLive: true,
  updatedAt: 1781241300000,
  scheduledTime: "2026-06-12T12:15:00+05:00",
  displayTimeZone: "Asia/Yangon",
  team1: { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl" },
  team2: { teamId: 76014, shortName: "Tomsk", name: "Tomsk" },
};

const status = { source: "bookmaker:melbet.com", status: "OK", lastSyncAt: "2026-06-12T06:30:00.000Z" };
const redis = new FakeRedis();

await recordLiveEnvelope(redis, { games: [baseGame], status }, 1000);
await recordLiveEnvelope(redis, { games: [{ ...baseGame, period: 2, timeToGo: "08:20", score1: 22, scoreText: "22 : 12" }], status }, 2000);
await recordLiveEnvelope(redis, { games: [{ ...baseGame, period: 3, timeToGo: "07:40", score1: 35, scoreText: "35 : 12" }], status }, 3000);

const timeline = await redis.lrange<Record<string, unknown>>(recorderKeys.gameTimeline("ipbl-66-w-pro-b:728563610"), 0, 10);
const snapshots = timeline.map((row) => JSON.parse(String(row)) as Record<string, unknown>);
assert.equal(snapshots.length, 3);
assert.equal(snapshots[0]?.quarter, 3);
assert.equal(snapshots[0]?.period, 3);
assert.equal(snapshots[0]?.timeRemaining, "07:40");
assert.equal(snapshots[1]?.quarter, 2);
assert.equal(snapshots[1]?.period, 2);
assert.equal(snapshots[2]?.quarter, 1);
assert.equal(snapshots[2]?.period, 1);

console.log("Quarter timeline recorder tests passed");
