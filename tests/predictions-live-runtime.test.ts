import assert from "node:assert/strict";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildPredictionRuntimeEnvelope, mapLiveGameToPredictionInput } from "../lib/runtime/prediction-runtime.ts";
import { createPredictionLiveHandler } from "../api/predictions/live.ts";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";

const sampleGame: ScheduleGame = {
  gameId: 728348559,
  tag: "ipbl-66-m-pro-b",
  status: "Online",
  statusDisplay: "4th quarter",
  upstreamStatusId: "melbet-live",
  score1: 78,
  score2: 63,
  scoreText: "78 : 63",
  fullScore: "25:32,29:13,24:18",
  localDate: "19.06.2026",
  localTime: "18:00",
  divisionLabel: "Pro Men B",
  period: 4,
  timeToGo: "03:19",
  timeIsGo: 1,
  isLive: true,
  updatedAt: 1_000,
  scheduledTime: "2026-06-19T12:00:00Z",
  sourceLocalDate: "19.06.2026",
  sourceLocalTime: "18:00",
  sourceTimeZone: "UTC+05:00",
  displayTimeZone: "Asia/Yangon",
  team1: { teamId: 76049, shortName: "Samara", name: "Samara" },
  team2: { teamId: 76050, shortName: "Krasnodar", name: "Krasnodar" },
};

const mapped = mapLiveGameToPredictionInput(sampleGame);
assert.equal(mapped.gameId, sampleGame.gameId);
assert.equal(mapped.period, sampleGame.period);
assert.equal(mapped.previousOdds, null);
assert.equal(mapped.currentOdds, null);

const runtime = buildPredictionRuntimeEnvelope(
  { games: [sampleGame], status: { status: "OK", source: "bookmaker:melbet.com+1xbet.com" } },
  { generatedAt: new Date("2026-06-21T00:00:00Z") },
);

assert.equal(runtime.count, 1);
assert.equal(runtime.source, "api/results/live");
assert.equal(runtime.predictions[0].gameId, sampleGame.gameId);
assert.equal(runtime.predictions[0].calibration.reason, "insufficient_history");
assert.equal(runtime.predictions[0].adaptive.remediation.action, "monitor");
assert.equal(runtime.summary.liveStates.late, 1);

const handler = createPredictionLiveHandler({
  buildLiveFeedEnvelope: async () => ({
    games: [sampleGame],
    status: { status: "OK", source: "bookmaker:melbet.com+1xbet.com" },
  }),
  now: () => new Date("2026-06-21T00:00:00Z"),
});

const headers: Record<string, string> = {};
let statusCode = 0;
let payload: unknown = null;

const res = {
  setHeader(name: string, value: string) {
    headers[name] = value;
    return this;
  },
  status(code: number) {
    statusCode = code;
    return this;
  },
  json(body: unknown) {
    payload = body;
    return this;
  },
} as unknown as VercelResponse;

await handler({ method: "GET", query: {}, headers: {} } as VercelRequest, res);

assert.equal(statusCode, 200);
assert.equal(headers["Cache-Control"], "no-store, max-age=0");
assert.equal(headers["Vercel-CDN-Cache-Control"], "no-store");
assert.equal((payload as { count?: number }).count, 1);
assert.equal((payload as { predictions?: Array<{ gameId: number }> }).predictions?.[0].gameId, sampleGame.gameId);

console.log("prediction live runtime tests passed");
