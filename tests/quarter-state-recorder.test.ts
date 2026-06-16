import assert from "node:assert/strict";
import type { RecordedLiveSnapshot } from "../lib/server/live-recorder.ts";
import { buildQuarterStateSnapshot, normalizeQuarterStateSnapshot, type QuarterStateInput } from "../lib/server/quarter-state-recorder.ts";

const input: QuarterStateInput = {
  gameId: 1073715,
  division: "Pro Men B",
  teams: ["Nizhny Novgorod", "Tolyatti"],
  quarter: 3,
  timeRemaining: "07:40",
  score: "35 : 31",
  source: "bookmaker:melbet.com",
};

const snapshot = buildQuarterStateSnapshot(input);
assert.deepEqual(snapshot, {
  gameId: 1073715,
  division: "Pro Men B",
  teams: ["Nizhny Novgorod", "Tolyatti"],
  quarter: 3,
  timeRemaining: "07:40",
  score: "35 : 31",
  source: "bookmaker:melbet.com",
});

assert.deepEqual(normalizeQuarterStateSnapshot(snapshot), snapshot);

const liveSnapshot = {
  schemaVersion: 1,
  capturedAt: "2026-06-16T18:00:00.000Z",
  capturedAtMs: 1781632800000,
  gameKey: "ipbl-66-m-pro-b:1073715",
  gameId: 1073715,
  divisionTag: "ipbl-66-m-pro-b",
  division: "Pro Men B",
  divisionLabel: "Pro Men B",
  quarter: 3,
  timeRemaining: "07:40",
  score: "35 : 31",
  quarterScore: "14:12",
  totalScore: "35 : 31",
  snapshotTime: "2026-06-16T18:00:00.000Z",
  team1: { teamId: 1, shortName: "Nizhny Novgorod", name: "Nizhny Novgorod" },
  team2: { teamId: 2, shortName: "Tolyatti", name: "Tolyatti" },
  score1: 35,
  score2: 31,
  scoreText: "35 : 31",
  fullScore: "14:12,11:10,10:9",
  quarterScores: [],
  period: 3,
  timeToGo: "07:40",
  timeIsGo: 1,
  status: "Online",
  statusDisplay: "Live",
  isLive: true,
  scheduledTime: null,
  localDate: "16.06.2026",
  localTime: "21:00",
  displayTimeZone: "Asia/Yangon",
  source: "bookmaker:melbet.com",
  fallbackFrom: null,
  sourceStatus: "OK",
  sourceUpdatedAt: "2026-06-16T17:59:58.000Z",
  transition: {
    previousCapturedAt: null,
    scoreDelta1: null,
    scoreDelta2: null,
    scoreChanged: false,
    periodChanged: false,
    clockDeltaSeconds: null,
    clockAnomaly: false,
    sourceChanged: false,
  },
} as const satisfies RecordedLiveSnapshot;

assert.deepEqual(buildQuarterStateSnapshot(liveSnapshot), {
  gameId: 1073715,
  division: "Pro Men B",
  teams: ["Nizhny Novgorod", "Tolyatti"],
  quarter: 3,
  timeRemaining: "07:40",
  score: "35 : 31",
  source: "bookmaker:melbet.com",
});

assert.throws(() => buildQuarterStateSnapshot({ ...input, gameId: 0 }), /gameId/);
assert.throws(() => buildQuarterStateSnapshot({ ...input, quarter: null }), /quarter/);

console.log("Quarter-state recorder tests passed");
