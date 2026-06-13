import assert from "node:assert/strict";
import {
  mergeTeamHistoryItems,
  officialOnlineTeamHistoryItems,
  teamHistoryItemsFromMonths,
} from "../lib/server/team-history-from-results.ts";
import type { StoredResultsMonthMap } from "../lib/server/ingest-results-month.ts";

const novokuznetsk = { teamId: 76020, shortName: "Novokuznetsk", name: "Novokuznetsk" };
const izhevsk = { teamId: 76023, shortName: "Izhevsk", name: "Izhevsk" };

const storedMonth: StoredResultsMonthMap = {
  "2026-06-10": [{
    date: "2026-06-10",
    division: "Pro Women A",
    divisionTag: "ipbl-66-w-pro-a",
    games: [{
      game: {
        gameId: 1071065,
        tag: "ipbl-66-w-pro-a",
        status: "ResultConfirmed",
        statusDisplay: "Finished",
        upstreamStatusId: "ResultConfirmed",
        score1: 85,
        score2: 89,
        scoreText: "85 : 89",
        fullScore: "28:22,23:20,16:30,18:17",
        localDate: "10.06.2026",
        localTime: "19:00",
        divisionLabel: "Pro Women A",
        period: null,
        timeToGo: null,
        isLive: false,
        scheduledTime: "2026-06-10T19:00:00+05:00",
        sourceLocalDate: "10.06.2026",
        sourceLocalTime: "19:00",
        sourceTimeZone: "UTC+05:00",
        displayTimeZone: "Asia/Yangon",
        team1: novokuznetsk,
        team2: izhevsk,
      },
      time: "19:00",
      teams: "Novokuznetsk vs Izhevsk",
      score: "85 : 89",
      division: "Pro Women A",
      divisionTag: "ipbl-66-w-pro-a",
      quarterTotals: "Q1 28 · Q2 23 · Q3 16 · Q4 18",
    }],
  }],
};

const recentCalendar = {
  data: {
    status: "Ok",
    totalCount: 6,
    items: [{
      game: {
        id: 1071071,
        gameStatus: "ResultConfirmed",
        score1: 105,
        score2: 99,
        score: "105:99",
        fullScore: "32:25,23:24,27:24,23:26",
        scheduledTime: "2026-06-12T19:00:00+05:00",
        localDate: "12.06.2026",
        localTime: "19:00",
      },
      league: { tag: "ipbl-66-w-pro-a" },
      status: { id: "ResultConfirmed", displayName: "Finished" },
      team1: novokuznetsk,
      team2: izhevsk,
    }],
  },
};

const stored = teamHistoryItemsFromMonths([storedMonth], 76020, "ipbl-66-w-pro-a");
const recent = officialOnlineTeamHistoryItems(recentCalendar, 76020, "ipbl-66-w-pro-a");
const merged = mergeTeamHistoryItems(stored, recent);
assert.deepEqual(merged.map((item) => item.game.localDate), ["12.06.2026", "10.06.2026"]);
assert.equal(merged[0].game.id, 1071071);
assert.equal(merged[0].game.score, "105 : 99");
assert.equal(merged[0].game.fullScore, "32:25,23:24,27:24,23:26");
console.log("Team history official recent calendar continuity tests passed");
