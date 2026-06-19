import assert from "node:assert/strict";
import { recordLiveEnvelope, recorderKeys, type RecorderRedis } from "../lib/server/live-recorder.ts";
import { recordOddsSnapshot, oddsHistoryKey, type OddsRedis } from "../lib/server/odds-movement.ts";
import { replayResponse } from "../api/recorder.ts";

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

function fakeRes() {
  const state = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as unknown,
  };
  return {
    state,
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value;
      return this;
    },
  } as any;
}

const redis = new FakeRedis();
const gameId = 728563613;
const gameKey = "ipbl-66-m-pro-b:728563613";

await recordLiveEnvelope(redis, {
  games: [{
    gameId,
    tag: "ipbl-66-m-pro-b",
    status: "Online",
    statusDisplay: "Live",
    upstreamStatusId: "Online",
    score1: 18,
    score2: 14,
    scoreText: "18 : 14",
    fullScore: "18:14",
    localDate: "12.06.2026",
    localTime: "12:15",
    divisionLabel: "Pro Men B",
    period: 1,
    timeToGo: "08:59",
    timeIsGo: 1,
    isLive: true,
    updatedAt: 1781241300000,
    scheduledTime: "2026-06-12T12:15:00+05:00",
    displayTimeZone: "Asia/Yangon",
    team1: { teamId: 76049, shortName: "Samara", name: "Samara" },
    team2: { teamId: 76050, shortName: "Krasnodar", name: "Krasnodar" },
  }],
  status: { source: "official:api1.ipbl.pro", status: "OK", lastSyncAt: "2026-06-12T06:00:00.000Z" },
}, Date.parse("2026-06-12T06:00:00.000Z"));

await recordOddsSnapshot(redis, {
  gameId,
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
  gameId,
  quarter: 2,
  marketType: "over_under",
  line: 43.5,
  overOdds: 1.89,
  underOdds: 1.89,
  bookmaker: "melbet",
  marketStatus: "open",
  capturedAt: "2026-06-12T06:04:00.000Z",
});

const response = fakeRes();
await replayResponse(new URLSearchParams({ mode: "replay", gameId: String(gameId) }), response, {
  getResultsRedis: () => redis,
});

assert.equal(response.state.statusCode, 200);
assert.equal(response.state.headers["Cache-Control"], "no-store, max-age=0");
assert.equal((response.state.body as { gameKey?: string }).gameKey, gameKey);
assert.equal((response.state.body as { timeline?: unknown[] }).timeline?.length, 4);
assert.deepEqual(
  (response.state.body as { timeline?: { kind?: string }[] }).timeline?.map((event) => event.kind),
  ["quarter", "result", "odds", "odds"],
);

const missing = fakeRes();
await replayResponse(new URLSearchParams({ mode: "replay", gameId: "99999999" }), missing, {
  getResultsRedis: () => redis,
});
assert.equal(missing.state.statusCode, 404);
assert.equal((missing.state.body as { error?: string }).error, "replay_not_found");

console.log("Recorder replay route tests passed");
