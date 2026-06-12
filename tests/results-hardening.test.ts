import assert from "node:assert/strict";
import type { ScheduleGame } from "../lib/server/calendar-normalize.ts";
import { buildStoredMonthMapWithStats } from "../lib/server/ingest-results-month.ts";
import {
  classifyResultEvidence,
  mergeStoredResultsMonths,
  parseResultsMetadata,
  parseStoredResultsMonth,
  verifiedThroughDateForMonth,
} from "../lib/server/results-hardening.ts";

const team1 = { teamId: 1, shortName: "Alpha", name: "Alpha" };
const team2 = { teamId: 2, shortName: "Beta", name: "Beta" };
const game = (overrides: Partial<ScheduleGame> = {}): ScheduleGame => ({
  gameId: 1,
  tag: "ipbl-66-m-pro-a",
  status: "ResultConfirmed",
  statusDisplay: "Finished",
  upstreamStatusId: "ResultConfirmed",
  score1: 80,
  score2: 70,
  scoreText: "80 : 70",
  fullScore: "20:20,20:15,20:20,20:15",
  localDate: "01.06.2026",
  localTime: "08:00",
  divisionLabel: "Pro Men A",
  period: null,
  timeToGo: null,
  timeIsGo: null,
  isLive: false,
  updatedAt: 100,
  scheduledTime: "2026-06-01T08:00:00+05:00",
  sourceLocalDate: "01.06.2026",
  sourceLocalTime: "08:00",
  sourceTimeZone: "UTC+05:00",
  displayTimeZone: "Asia/Yangon",
  team1,
  team2,
  ...overrides,
});

const live = game({ gameId: 2, status: "Online", statusDisplay: "Live", upstreamStatusId: "Online", isLive: true });
const duplicate = game({ updatedAt: 200 });
const partial = game({ gameId: 3, score1: 90, score2: 80, scoreText: "90 : 80", fullScore: "20:20,25:20,20:20" });
const conflict = game({ gameId: 4, score1: 22, score2: 18, scoreText: "22 : 18", fullScore: "22:18,21:24,12:18,13:14" });

assert.equal(classifyResultEvidence(partial).periodState, "partial");
assert.equal(classifyResultEvidence(conflict).scoreIntegrity, "conflict");

const built = buildStoredMonthMapWithStats(
  [game(), duplicate, live, partial, conflict],
  2026,
  5,
  "ipbl-66-m-pro-a",
  "Pro Men A"
);
const rows = built.map["2026-06-01"][0].games;
assert.deepEqual(rows.map((row) => row.game.gameId), [1, 3, 4]);
assert.equal(built.stats.rejectedNonFinished, 1);
assert.equal(built.stats.duplicatesCollapsed, 1);
assert.equal(rows.find((row) => row.game.gameId === 3)?.evidence?.periodState, "partial");
assert.match(rows.find((row) => row.game.gameId === 3)?.quarterTotals ?? "", /partial periods/);
const quarantined = rows.find((row) => row.game.gameId === 4);
assert.equal(quarantined?.game.scoreText, "22 : 18", "verified final total must be preserved");
assert.equal(quarantined?.game.fullScore, null, "contradictory period matrix must be quarantined");
assert.equal(quarantined?.quarterTotals, null);
assert.equal(quarantined?.evidence?.quarterEvidenceQuarantined, true);

const existing = buildStoredMonthMapWithStats(
  [game({ gameId: 10, updatedAt: 500 }), game({ gameId: 11, localTime: "09:00" })],
  2026, 5, "ipbl-66-m-pro-a", "Pro Men A"
).map;
const incoming = buildStoredMonthMapWithStats(
  [
    game({ gameId: 10, updatedAt: 600, fullScore: "20:20,20:15,20:20" }),
    game({ gameId: 12, localTime: "10:00" }),
  ],
  2026, 5, "ipbl-66-m-pro-a", "Pro Men A"
).map;
const merged = mergeStoredResultsMonths(existing, incoming);
const mergedRows = merged.map["2026-06-01"][0].games;
assert.deepEqual(mergedRows.map((row) => row.game.gameId), [10, 11, 12]);
assert.equal(mergedRows.find((row) => row.game.gameId === 10)?.game.fullScore, "20:20,20:15,20:20,20:15", "weaker incoming evidence must not replace complete stored evidence");
assert.equal(merged.stats.addedRows, 1);
assert.equal(merged.stats.preservedRows, 1);

const existingWithLegacyLive = buildStoredMonthMapWithStats(
  [game({ gameId: 20 })],
  2026, 5, "ipbl-66-m-pro-a", "Pro Men A"
).map;
existingWithLegacyLive["2026-06-01"][0].games.push({
  ...existingWithLegacyLive["2026-06-01"][0].games[0],
  game: live,
});
const cleaned = mergeStoredResultsMonths(existingWithLegacyLive, buildStoredMonthMapWithStats([], 2026, 5, "ipbl-66-m-pro-a", "Pro Men A").map);
assert.deepEqual(cleaned.map["2026-06-01"][0].games.map((row) => row.game.gameId), [20], "legacy live rows must be pruned during merge");

assert.equal(
  verifiedThroughDateForMonth(2026, 6, new Date("2026-06-12T00:00:00Z")),
  "2026-06-12"
);
assert.equal(
  verifiedThroughDateForMonth(2026, 5, new Date("2026-06-12T00:00:00Z")),
  "2026-05-31"
);
assert.equal(
  verifiedThroughDateForMonth(2026, 7, new Date("2026-06-12T00:00:00Z")),
  null
);

console.log("Phase A Results hardening fixture tests passed");

const validMetadata = {
  schemaVersion: 1 as const,
  status: "source_unavailable" as const,
  source: "official:api1.ipbl.pro",
  checkedAt: "2026-06-12T00:00:00Z",
  updatedAt: null,
  verifiedThroughDate: null,
  year: 2026,
  month: 6,
  divisionTag: "ipbl-66-m-pro-a",
};
assert.deepEqual(parseResultsMetadata(JSON.stringify(validMetadata)), validMetadata);
assert.equal(parseResultsMetadata({ schemaVersion: 1, status: "ok" }), null, "incomplete metadata must be rejected");
assert.equal(parseResultsMetadata({ ...validMetadata, month: 13 }), null, "invalid month metadata must be rejected");
assert.deepEqual(parseStoredResultsMonth(existing), existing);
assert.equal(parseStoredResultsMonth({ "2026-06-01": {} }), null, "non-array day groups must be rejected");
assert.equal(parseStoredResultsMonth({ "not-a-date": [] }), null, "invalid day keys must be rejected");
assert.equal(parseStoredResultsMonth({ "2026-06-01": [{ date: "2026-06-01", division: "A", divisionTag: "a", games: [{}] }] }), null, "malformed rows must be rejected");

const productionShapedLegacy = JSON.parse(JSON.stringify(existing));
for (const groups of Object.values(productionShapedLegacy)) {
  for (const group of groups as Array<{ games?: Array<{ game: { timeIsGo?: number | null } }> }>) {
    for (const row of group.games ?? []) delete row.game.timeIsGo;
  }
}
assert.deepEqual(
  parseStoredResultsMonth(productionShapedLegacy),
  productionShapedLegacy,
  "legacy production rows may omit optional timeIsGo"
);
