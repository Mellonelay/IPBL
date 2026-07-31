import assert from "node:assert/strict";
import { computeH2H, h2hDateTimeKey } from "../src/api/normalize.ts";
import type { TeamHistoryGame } from "../src/api/types.ts";

const team1 = { teamId: 1, shortName: "A", name: "A" };
const team2 = { teamId: 2, shortName: "B", name: "B" };
const game = (gameId: number, localDate: string, localTime: string): TeamHistoryGame => ({
  gameId,
  scheduledTime: "",
  localDate,
  localTime,
  status: "ResultConfirmed",
  scoreText: "90:80",
  fullScore: "20:20,25:20,20:20,25:20",
  team1,
  team2,
  tag: "ipbl-66-m-pro-a",
});

const games = [
  game(1, "30.04.2026", "17:30"),
  game(2, "29.05.2026", "12:30"),
  game(3, "01.06.2026", "08:00"),
  game(4, "29.05.2026", "18:30"),
];
const result = computeH2H(games, games, 1, 2, 15);
assert.deepEqual(result.map((entry) => entry.gameId), [3, 4, 2, 1]);
const oneSided = computeH2H(games, [], 1, 2, 15);
assert.deepEqual(oneSided.map((entry) => entry.gameId), [3, 4, 2, 1], "one verified team history is sufficient");
const deduped = computeH2H(games, games, 1, 2, 15);
assert.equal(new Set(deduped.map((entry) => entry.gameId)).size, deduped.length);
assert.ok(h2hDateTimeKey("29.05.2026", "12:30") > h2hDateTimeKey("30.04.2026", "17:30"));
console.log("H2H newest-first ordering tests passed");
