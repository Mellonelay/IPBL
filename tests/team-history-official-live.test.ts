import assert from "node:assert/strict";
import {
  mergeTeamHistoryItems,
  officialOnlineTeamHistoryItems,
  teamHistoryItemsFromMonths,
} from "../lib/server/team-history-from-results.ts";
import type { StoredResultsMonthMap } from "../lib/server/ingest-results-month.ts";

const alpha = { teamId: 76055, shortName: "Anapa", name: "Anapa" };
const beta = { teamId: 76054, shortName: "Magadan", name: "Magadan" };

const historicalMonth: StoredResultsMonthMap = {
  "2026-06-10": [{
    date: "2026-06-10",
    division: "Pro Men Z",
    divisionTag: "ipbl-66-m-pro-z",
    games: [{
      game: {
        gameId: 1,
        tag: "ipbl-66-m-pro-z",
        status: "ResultConfirmed",
        statusDisplay: "Finished",
        upstreamStatusId: "ResultConfirmed",
        score1: 85,
        score2: 89,
        scoreText: "85 : 89",
        fullScore: "50:42,43:46,44:35,35:35",
        localDate: "10.06.2026",
        localTime: "20:30",
        divisionLabel: "Pro Men Z",
        period: null,
        timeToGo: null,
        isLive: false,
        scheduledTime: "2026-06-10T20:30:00+05:00",
        sourceLocalDate: "10.06.2026",
        sourceLocalTime: "20:30",
        sourceTimeZone: "UTC+05:00",
        displayTimeZone: "Asia/Yangon",
        team1: alpha,
        team2: beta,
      },
      time: "20:30",
      teams: "Anapa vs Magadan",
      score: "85 : 89",
      division: "Pro Men Z",
      divisionTag: "ipbl-66-m-pro-z",
      quarterTotals: "Q1 50 · Q2 43 · Q3 46 · Q4 35",
    }],
  }],
};

const officialOnline = {
  data: {
    status: "Ok",
    totalCount: 1,
    items: [{
      game: {
        id: 1072122,
        gameStatus: "Online",
        score1: 74,
        score2: 90,
        score: "74:90",
        fullScore: null,
        scheduledTime: "2026-06-13T19:00:00+05:00",
        localDate: "13.06.2026",
        localTime: "19:00",
      },
      league: { tag: "ipbl-66-m-pro-z" },
      status: { id: "Online", displayName: "Live" },
      team1: alpha,
      team2: beta,
    }],
  },
};

const stored = teamHistoryItemsFromMonths([historicalMonth], 76055, "ipbl-66-m-pro-z");
const live = officialOnlineTeamHistoryItems(officialOnline, 76055, "ipbl-66-m-pro-z");
assert.equal(live.length, 1);
assert.equal(live[0].game.id, 1072122);
assert.equal(live[0].game.localDate, "13.06.2026");
assert.equal(live[0].game.score, "74 : 90");
assert.equal(live[0].game.quarterTotals, null);
const merged = mergeTeamHistoryItems(stored, live);
assert.deepEqual(merged.map((item) => item.game.id), [1072122, 1]);
console.log("Team history current official online freshness merge tests passed");
