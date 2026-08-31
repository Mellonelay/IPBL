import assert from "node:assert/strict";
import { safeCompare } from "../lib/server/auth.js";
import {
  RECORDER_RETENTION, buildSnapshot, isAuthorizedCronRequest, parseQuarterScores,
  recordLiveEnvelope, recorderKeys, snapshotFingerprint, type RecorderRedis, type RecordedLiveSnapshot,
} from "../lib/server/live-recorder.ts";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";

class FakeRedis implements RecorderRedis {
  values = new Map<string, unknown>(); lists = new Map<string, unknown[]>(); sets = new Map<string, Set<string>>(); trims: Array<[string,number,number]> = [];
  async get<T>(key:string){ return (this.values.get(key) as T | undefined) ?? null; }
  async set(key:string,value:unknown){ this.values.set(key,value); return "OK"; }
  async lpush(key:string,value:unknown){ const list=this.lists.get(key)??[]; list.unshift(value); this.lists.set(key,list); return list.length; }
  async ltrim(key:string,start:number,stop:number){ const list=this.lists.get(key)??[]; this.lists.set(key,list.slice(start,stop+1)); this.trims.push([key,start,stop]); return "OK"; }
  async lrange<T>(key:string,start:number,stop:number){ return (this.lists.get(key)??[]).slice(start,stop+1) as T[]; }
  async sadd(key:string,...members:string[]){ const set=this.sets.get(key)??new Set<string>(); members.forEach(x=>set.add(x)); this.sets.set(key,set); return members.length; }
  async srem(key:string,...members:string[]){ const set=this.sets.get(key)??new Set<string>(); members.forEach(x=>set.delete(x)); return members.length; }
  async smembers(key:string){ return [...(this.sets.get(key)??new Set<string>())]; }
  async expire(){ return 1; }
}

const game: ScheduleGame = {
  gameId: 728563609, tag: "ipbl-66-w-pro-b", status: "Online", statusDisplay: "Live", upstreamStatusId: "Online",
  score1: 32, score2: 34, scoreText: "32 : 34", fullScore: "16:17,16:17", localDate: "12.06.2026", localTime: "12:15",
  divisionLabel: "Pro Women B", period: 3, timeToGo: "08:10", timeIsGo: 110, isLive: true, updatedAt: 1781241300000,
  scheduledTime: "2026-06-12T12:15:00+05:00", displayTimeZone: "Asia/Yangon",
  team1: { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl (Women)" },
  team2: { teamId: 76014, shortName: "Tomsk", name: "Tomsk (Women)" },
};
const status = { source: "bookmaker:melbet.com", fallbackFrom: "official:api1.ipbl.pro", status: "PARTIAL", lastSyncAt: "2026-06-12T06:30:00.000Z" };
assert.deepEqual(parseQuarterScores("16:17,16:17,bad"), [{period:1,team1:16,team2:17},{period:2,team1:16,team2:17}]);
assert.equal(isAuthorizedCronRequest("Bearer secret", "secret"), true);
assert.equal(isAuthorizedCronRequest("Bearer wrong", "secret"), false);

const first = buildSnapshot(game,status,1000,null);
assert.equal(first.division, "Pro Women B");
assert.equal(first.quarter, 3);
assert.equal(first.timeRemaining, "08:10");
assert.equal(first.score, "32 : 34");
assert.equal(first.quarterScore, null);
assert.equal(first.totalScore, "32 : 34");
assert.equal(first.snapshotTime, "1970-01-01T00:00:01.000Z");
const changed = buildSnapshot({...game,score1:35,scoreText:"35 : 34",timeToGo:"07:40"},status,2000,first);
assert.equal(changed.transition.scoreDelta1,3);
assert.equal(changed.transition.scoreDelta2,0);
assert.equal(changed.transition.clockDeltaSeconds,30);
assert.equal(changed.transition.clockAnomaly,false);
const reset = buildSnapshot({...game,period:4,timeToGo:"10:00"},status,3000,changed);
assert.equal(reset.transition.periodChanged,true);
assert.equal(reset.transition.clockDeltaSeconds,null);
assert.notEqual(snapshotFingerprint(first),snapshotFingerprint(changed));

const redis = new FakeRedis();
const run1 = await recordLiveEnvelope(redis,{games:[game],status},1000);
assert.equal(run1.recordedSnapshots,1); assert.equal(run1.acceptedGames,1);
const run2 = await recordLiveEnvelope(redis,{games:[game],status:{...status,lastSyncAt:"2026-06-12T06:31:00.000Z"}},2000);
assert.equal(run2.recordedSnapshots,0); assert.equal(run2.duplicateSnapshots,1);
const run3 = await recordLiveEnvelope(redis,{games:[{...game,score1:35,scoreText:"35 : 34",timeToGo:"07:40"}],status},3000);
assert.equal(run3.recordedSnapshots,1);
const timelineKey=recorderKeys.gameTimeline(`${game.tag}:${game.gameId}`);
assert.equal((redis.lists.get(timelineKey)??[]).length,2);
const timeline = await redis.lrange<Record<string, unknown>>(timelineKey, 0, 10);
const snapshots = timeline.map((row) => JSON.parse(String(row)) as Record<string, unknown>);
assert.equal(snapshots[0]?.quarter, 3);
assert.equal(snapshots[0]?.timeRemaining, "07:40");
assert.ok(redis.trims.some(([,start,stop])=>start===0&&stop===RECORDER_RETENTION-1));
const latestRaw=redis.values.get(recorderKeys.gameLatest(`${game.tag}:${game.gameId}`));
const latest=JSON.parse(String(latestRaw)) as RecordedLiveSnapshot;
assert.equal(latest.transition.scoreDelta1,3);

const invalid = await recordLiveEnvelope(redis,{games:[{...game,tag:"ipbl-66-m-pro-h"}],status},4000);
assert.equal(invalid.acceptedGames,0); assert.equal(invalid.rejectedGames[0].reason,"unapproved-division");
assert.deepEqual(invalid.missingPreviouslyActive,[`${game.tag}:${game.gameId}`]);
await redis.sadd(recorderKeys.active, `${game.tag}:${game.gameId}`);
const failedSource = await recordLiveEnvelope(redis,{games:[],status:{source:"none",status:"FAIL"}},5000);
assert.deepEqual(failedSource.missingPreviouslyActive,[]);
assert.deepEqual(await redis.smembers(recorderKeys.active),[`${game.tag}:${game.gameId}`]);
console.log("Phase C live recorder tests passed");
