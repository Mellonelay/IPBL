import assert from "node:assert/strict";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import { buildBackfillDays, runOfficialBackfillRange } from "../lib/server/results-official-backfill.ts";
import { resultsKvKey } from "../lib/server/results-sync-constants.ts";

class MemoryRedis {
  values = new Map<string, unknown>();
  writes: Array<{ key: string; value: unknown }> = [];
  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }
  async set(key: string, value: unknown): Promise<unknown> {
    this.values.set(key, value);
    this.writes.push({ key, value });
    return "OK";
  }
}

const team1 = { teamId: 76001, shortName: "Alpha", name: "Alpha" };
const team2 = { teamId: 76002, shortName: "Beta", name: "Beta" };

function makeGame(gameId: number, localDate: string, localTime: string, tag = "ipbl-66-m-pro-a"): ScheduleGame {
  const divisionLabel = tag === "ipbl-66-m-pro-a" ? "Pro Men A" : "Pro Women A";
  return {
    gameId,
    tag,
    status: "ResultConfirmed",
    statusDisplay: "Finished",
    upstreamStatusId: "ResultConfirmed",
    score1: 80 + gameId,
    score2: 70 + gameId,
    scoreText: `${80 + gameId} : ${70 + gameId}`,
    fullScore: "20:20,20:15,20:20,20:15",
    localDate,
    localTime,
    divisionLabel,
    period: null,
    timeToGo: null,
    timeIsGo: null,
    isLive: false,
    updatedAt: gameId,
    scheduledTime: `${localDate.slice(6, 10)}-${localDate.slice(3, 5)}-${localDate.slice(0, 2)}T${localTime}:00+05:00`,
    sourceLocalDate: localDate,
    sourceLocalTime: localTime,
    sourceTimeZone: "UTC+05:00",
    displayTimeZone: "Asia/Yangon",
    team1,
    team2,
  };
}

const days = buildBackfillDays("2026-06-01", "2026-06-03");
assert.deepEqual(days, ["2026-06-01", "2026-06-02", "2026-06-03"]);

const calls: Array<{ tag: string; day: string }> = [];
const redis = new MemoryRedis();
const targetTag = "ipbl-66-m-pro-a";
const result = await runOfficialBackfillRange(
  { from: "2026-06-01", to: "2026-06-03" },
  {
    now: () => new Date("2026-07-05T14:46:21Z"),
    redis,
    fetchDay: async (divisionTag, isoDate) => {
      calls.push({ tag: divisionTag, day: isoDate });
      if (divisionTag !== targetTag) return [];
      if (isoDate === "2026-06-01") return [makeGame(1, "01.06.2026", "08:00", divisionTag)];
      if (isoDate === "2026-06-02") return [makeGame(1, "01.06.2026", "08:00", divisionTag), makeGame(2, "02.06.2026", "09:00", divisionTag)];
      if (isoDate === "2026-06-03") return [makeGame(3, "03.06.2026", "10:00", divisionTag)];
      return [];
    },
  }
);

assert.equal(result.daysFetched, 3);
assert.equal(result.divisionCount, 14);
assert.equal(result.monthsWritten, 14);
assert.equal(calls.length, 42);
assert.deepEqual(days, ["2026-06-01", "2026-06-02", "2026-06-03"]);
assert.equal(new Set(calls.slice(0, 14).map((call) => call.day)).size, 1, "first fetch batch must stay on the first day");
assert.equal(calls[0]?.day, "2026-06-01");
assert.equal(calls[13]?.day, "2026-06-01");
assert.equal(calls[14]?.day, "2026-06-02");

const monthKey = resultsKvKey(2026, 6, targetTag);
const stored = JSON.parse(String(redis.values.get(monthKey)));
assert.deepEqual(stored["2026-06-01"][0].games.map((row: any) => row.game.gameId), [1]);
assert.deepEqual(stored["2026-06-02"][0].games.map((row: any) => row.game.gameId), [2]);
assert.deepEqual(stored["2026-06-03"][0].games.map((row: any) => row.game.gameId), [3]);
assert.equal(result.results.find((entry) => entry.divisionTag === targetTag)?.gamesAccepted, 3);

console.log("Official results backfill range tests passed");
