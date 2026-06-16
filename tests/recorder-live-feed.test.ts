import assert from "node:assert/strict";

import { readRecordedLiveFeed, recordLiveEnvelope, recorderKeys, type RecorderRedis } from "../lib/server/live-recorder.ts";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";

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

const game: ScheduleGame = {
  gameId: 728563609,
  tag: "ipbl-66-w-pro-b",
  status: "Online",
  statusDisplay: "Live",
  upstreamStatusId: "Online",
  score1: 32,
  score2: 34,
  scoreText: "32 : 34",
  fullScore: "16:17,16:17",
  localDate: "12.06.2026",
  localTime: "12:15",
  divisionLabel: "Pro Women B",
  period: 3,
  timeToGo: "08:10",
  timeIsGo: 110,
  isLive: true,
  updatedAt: 1781241300000,
  scheduledTime: "2026-06-12T12:15:00+05:00",
  displayTimeZone: "Asia/Yangon",
  team1: { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl (Women)" },
  team2: { teamId: 76014, shortName: "Tomsk", name: "Tomsk (Women)" },
};

const redis = new FakeRedis();
await recordLiveEnvelope(redis, {
  games: [game],
  status: {
    source: "bookmaker:melbet.com",
    fallbackFrom: "official:api1.ipbl.pro",
    status: "PARTIAL",
    requestedDivisions: 13,
    successfulDivisions: 1,
  },
}, 1000);

const feed = await readRecordedLiveFeed(redis);
assert.equal(feed.games.length, 1);
assert.equal(feed.games[0].gameId, game.gameId);
assert.equal(feed.games[0].scoreText, "32 : 34");
assert.equal(feed.status.source, "bookmaker:melbet.com");
assert.equal(feed.status.requestedDivisions, 13);
assert.equal(feed.status.successfulDivisions, 1);
assert.equal(feed.status.fallbackFrom, "official:api1.ipbl.pro");
assert.equal(feed.games[0].team1.teamId, 76013);
assert.equal(feed.games[0].team2.teamId, 76014);
assert.deepEqual(await redis.smembers(recorderKeys.active), [`${game.tag}:${game.gameId}`]);

console.log("Recorder live feed tests passed");
