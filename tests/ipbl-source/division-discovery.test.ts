function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) throw new Error(message ?? `Expected ${String(expected)} but received ${String(actual)}`);
}

function assertDeepEqual(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) throw new Error(`Expected ${expectedJson} but received ${actualJson}`);
}

import { USER_BETTING_WATCHLIST } from "../../src/results/divisions.ts";
import { discoverActiveDivisionsFromLiveMatches } from "../../src/results/live-division-discovery.ts";
import type { Ma1xBetLiveMatch } from "../../src/results/live-source.ts";

const ids = USER_BETTING_WATCHLIST.map((division) => division.id);
assertDeepEqual(ids, [
  "ipbl-66-m-pro-a",
  "ipbl-66-m-pro-b",
  "ipbl-66-m-pro-c",
  "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g",
  "ipbl-66-w-pro-a",
  "ipbl-66-w-pro-b",
  "ipbl-66-w-pro-c",
  "ipbl-66-w-pro-g",
  "ipbl-66-w-pro-k",
]);

const baseMatch: Ma1xBetLiveMatch = {
  source: "ma-1xbet:GetSportsShortZip",
  sourceUrl: "fixture",
  gameId: 1,
  leagueId: 2496666,
  division: "IPBL Pro A",
  homeTeam: "Maykop",
  awayTeam: "Samara",
  homeScore: 11,
  awayScore: 9,
  periodScores: null,
  currentPeriod: 1,
  clock: "08:12",
  status: "live",
  rawPathMap: {},
  confidence: "HIGH",
};

const discovery = discoverActiveDivisionsFromLiveMatches([baseMatch], { discoveredAt: "2026-06-02T00:00:00Z" });
assertEqual(discovery.watchlistStatuses["ipbl-66-m-pro-a"], "active");
assertEqual(discovery.watchlistStatuses["ipbl-66-m-pro-g"], "inactive_or_not_currently_listed");
assertEqual(discovery.watchlistStatuses["ipbl-66-w-pro-g"], "inactive_or_not_currently_listed");
assertEqual(discovery.watchlistStatuses["ipbl-66-w-pro-k"], "inactive_or_not_currently_listed");

const womenDiscovery = discoverActiveDivisionsFromLiveMatches([
  { ...baseMatch, gameId: 2, division: "Women Pro G", homeTeam: "Women G Team 1", awayTeam: "Women G Team 2" },
  { ...baseMatch, gameId: 3, division: "Women Pro K", homeTeam: "Women K Team 1", awayTeam: "Women K Team 2" },
]);
assertEqual(womenDiscovery.watchlistStatuses["ipbl-66-w-pro-g"], "active");
assertEqual(womenDiscovery.watchlistStatuses["ipbl-66-w-pro-k"], "active");
