import assert from "node:assert/strict";
import { buildLiveFeedEnvelope } from "../../lib/server/live-feed.ts";

const envelope = await buildLiveFeedEnvelope({
  getResultsRedis: () => null,
  readRecordedLiveFeed: async () => null,
  fetchLiveTag: async (tag: string) => ({
    tag,
    games: tag === "ipbl-66-m-pro-b"
      ? [{
          gameId: 728348559,
          tag,
          status: "Online",
          statusDisplay: "4th quarter",
          upstreamStatusId: "official-detail",
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
        }]
      : [],
    error: undefined,
  }),
  fetchBookmakerLive: async () => ({
    games: [],
    sourceLeagues: [],
    sourceFailures: [],
    receivedEvents: 0,
    unmatched: [],
  }),
  reconcileLiveGamesWithOfficialDetail: async (games) => ({ games, checked: 0, dropped: 0, updated: 0 }),
});

assert.equal(envelope.status.source, "official:api1.ipbl.pro");
assert.equal(envelope.status.fallbackFrom, null);
assert.equal(envelope.games.length > 0, true);
assert.equal(envelope.games[0].upstreamStatusId, "official-detail");
console.log("live feed contract test passed");
