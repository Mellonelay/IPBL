import assert from "node:assert/strict";
import { classifyBookmakerSourceFailure, mergeBookmakerLiveResultsByGameId, parseBookmakerLivePageHtml, parseBookmakerLivePayload, parseBookmakerLivePayloads, remainingClock } from "../lib/server/bookmaker-live.ts";

const raw = {
  Success: true,
  Value: [
    {
      I: 728348559, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Samara", O2: "Krasnodar", O1I: 4431639, O2I: 4866337,
      S: 1781168401, U: 1781170531,
      SC: {
        FS: { S1: 78, S2: 63 },
        PS: [
          { Key: 1, Value: { S1: 25, S2: 32 } },
          { Key: 2, Value: { S1: 29, S2: 13 } },
          { Key: 3, Value: { S1: 24, S2: 18 } },
        ],
        CP: 3, CPS: "3rd quarter", TS: 1601, TR: -1,
      },
    },
    {
      I: 728363780, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Belgorod", O2: "Saratov", O1I: 8630740, O2I: 8630741,
      S: 1781176200, U: 1781176647,
      SC: {
        FS: { S1: 24, S2: 8 },
        PS: [{ Key: 1, Value: { S1: 24, S2: 8 } }],
        CP: 1, CPS: "1st quarter", TS: 447, TR: -1,
      },
    },
    {
      I: 1, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Unverified City", O2: "Unknown City", O1I: 1, O2I: 2,
      SC: { FS: { S1: 1, S2: 2 }, CP: 1, TS: 10, TR: -1 },
    },
  ],
};



const currentMenRaw = {
  Success: true,
  Value: [
    {
      I: 2496666001, LI: 2496666, L: "IPBL. Pro Division",
      O1: "Omsk", O2: "Vorkuta", O1I: 111001, O2I: 111002,
      S: 1781176200, U: 1781176647,
      SC: { FS: { S1: 5, S2: 4 }, PS: [{ Key: 1, Value: { S1: 5, S2: 4 } }], CP: 1, CPS: "1st quarter", TS: 123, TR: -1 },
    },
  ],
};

const currentWomenRaw = {
  Success: true,
  Value: [
    {
      I: 2496667001, LI: 2496667, L: "IPBL. Pro Division. Women",
      O1: "Kursk (Women)", O2: "Orenburg (Women)", O1I: 222001, O2I: 222002,
      S: 1781176200, U: 1781176647,
      SC: { FS: { S1: 0, S2: 0 }, PS: [{ Key: 1, Value: { S1: 0, S2: 0 } }], CP: 1, CPS: "1st quarter", TS: 60, TR: -1 },
    },
  ],
};

const womenRaw = {
  Success: true,
  Value: [
    {
      I: 728540404, LI: 2496667, L: "IPBL. Pro Division. Women",
      O1: "Cheboksary (Women)", O2: "Yaroslavl (Women)", O1I: 9814545, O2I: 9814547,
      S: 1781232900, U: 1781234700,
      SC: {
        FS: { S1: 85, S2: 62 },
        PS: [
          { Key: 1, Value: { S1: 36, S2: 14 } },
          { Key: 2, Value: { S1: 17, S2: 32 } },
          { Key: 3, Value: { S1: 32, S2: 16 } },
        ],
        CP: 4, CPS: "Break", TS: 1800, TR: -1,
      },
    },
  ],
};

assert.equal(remainingClock(3, 1601), "03:19");
assert.equal(remainingClock(1, 0), "10:00");
assert.equal(remainingClock(4, 1800), "10:00");
const parsed = parseBookmakerLivePayload(raw);
assert.equal(parsed.receivedEvents, 3);
assert.equal(parsed.games.length, 1);
assert.equal(parsed.unmatched.length, 2);
const samara = parsed.games.find((game) => game.team1.shortName === "Samara")!;
assert.equal(samara.tag, "ipbl-66-m-pro-b");
assert.equal(samara.divisionLabel, "Pro Men B");
assert.equal(samara.team1.teamId, 76049);
assert.equal(samara.team2.teamId, 76050);
assert.equal(samara.scoreText, "78 : 63");
assert.equal(samara.fullScore, "25:32,29:13,24:18");
assert.equal(samara.timeToGo, "03:19");
const excluded = parsed.unmatched.find((event) => event.team1 === "Belgorod" && event.team2 === "Saratov");
assert.ok(excluded, "teams outside the approved division list must not render");
assert.equal(excluded.reason, "unverified-team");
assert.equal(excluded.leagueId, 2496666);
assert.equal(excluded.payloadState, "scored");
assert.equal(parsed.unmatched[0].reason, "unverified-team");

const combined = parseBookmakerLivePayloads([raw, womenRaw]);
assert.equal(combined.receivedEvents, 4);
assert.deepEqual(combined.sourceLeagues, [2496666, 2496667]);
assert.equal(combined.games.length, 2);
assert.equal(combined.unmatched.length, 2);
const womenB = combined.games.find((game) => game.tag === "ipbl-66-w-pro-b")!;
assert.ok(womenB, "the separate IPBL women stream must produce a Women B live game");
assert.equal(womenB.divisionLabel, "Pro Women B");
assert.equal(womenB.team1.teamId, 76012);
assert.equal(womenB.team1.shortName, "Cheboksary");
assert.equal(womenB.team2.teamId, 76013);
assert.equal(womenB.team2.shortName, "Yaroslavl");
assert.equal(womenB.scoreText, "85 : 62");
assert.equal(womenB.fullScore, "36:14,17:32,32:16");
assert.equal(womenB.period, 4);

const currentCombined = parseBookmakerLivePayloads([currentMenRaw, currentWomenRaw]);
assert.equal(currentCombined.receivedEvents, 2);
assert.equal(currentCombined.unmatched.length, 0);
const omskLive = currentCombined.games.find((game) => game.team1.shortName === "Omsk" && game.team2.shortName === "Vorkuta")!;
assert.ok(omskLive, "current IPBL Pro Division Omsk vs Vorkuta must render as a live card");
assert.equal(omskLive.tag, "ipbl-66-m-pro-a");
assert.equal(omskLive.divisionLabel, "Pro Men A");
assert.equal(omskLive.team1.teamId, 134);
assert.equal(omskLive.team2.teamId, 163);
assert.equal(omskLive.scoreText, "5 : 4");
const kurskLive = currentCombined.games.find((game) => game.team1.shortName === "Kursk" && game.team2.shortName === "Orenburg")!;
assert.ok(kurskLive, "current IPBL Pro Division Women Kursk vs Orenburg must render as a live card");
assert.equal(kurskLive.tag, "ipbl-66-w-pro-k");
assert.equal(kurskLive.divisionLabel, "Pro Women K");
assert.equal(kurskLive.team1.teamId, 76018);
assert.equal(kurskLive.team2.teamId, 76017);
assert.equal(kurskLive.scoreText, "0 : 0");

const melbetMirror = {
  games: [{ ...omskLive, updatedAt: 1_000 }],
  unmatched: [],
  receivedEvents: 1,
  sourceLeagues: [2496666],
  sourceFailures: [],
};
const oneXBetMirror = {
  games: [{ ...omskLive, score1: 6, score2: 5, scoreText: "6 : 5", updatedAt: 2_000 }],
  unmatched: [],
  receivedEvents: 1,
  sourceLeagues: [2496666],
  sourceFailures: [{ leagueId: 2496666, error: "mirror-ok", source: "1xbet" as const }],
};
const mergedMirrors = mergeBookmakerLiveResultsByGameId([melbetMirror, oneXBetMirror]);
assert.equal(mergedMirrors.games.length, 1);
assert.equal(mergedMirrors.games[0].scoreText, "6 : 5");
assert.equal(mergedMirrors.receivedEvents, 2);
assert.equal(mergedMirrors.sourceFailures.length, 1);

console.log("Bookmaker live adapter tests passed");

const bookmakerPageFixture = `
<script type="application/ld+json">[
  {"@context":"https://schema.org","@type":"SportsEvent","name":"Krasnodar - Tyumen","startDate":"2026-06-19T12:00:00Z","url":"https://melbet.com/en/live/basketball/2496666-ipbl-pro-division/730347660-krasnodar-tyumen"},
  {"@context":"https://schema.org","@type":"SportsEvent","name":"Nalchik - Saratov","startDate":"2026-06-19T12:10:00Z","url":"https://melbet.com/en/live/basketball/2496666-ipbl-pro-division/730348653-nalchik-saratov"}
]</script>
<li class="dashboard-game--theme-gray-100 dashboard-game dashboard-champ__game">
  <div class="dashboard-game-block">
    <a href="/en/live/basketball/2496666-ipbl-pro-division/730347660-krasnodar-tyumen" class="dashboard-game-block__link">
      <span class="ui-team-scores--size-m ui-team-scores--theme-gray-100 ui-team-scores dashboard-game-block__teams">
        <span class="ui-team-scores__top">
          <span class="ui-team-scores__teams ui-team-scores-teams">
            <div class="dashboard-game-team-info dashboard-game-block__team"><div class="ui-team-score-name--nowrap ui-team-score-name"><span class="ui-caption--size-m ui-caption dashboard-game-team-info__name">Krasnodar</span></div></div>
            <div class="dashboard-game-team-info dashboard-game-block__team"><div class="ui-team-score-name--nowrap ui-team-score-name"><span class="ui-caption--size-m ui-caption dashboard-game-team-info__name">Tyumen</span></div></div>
          </span>
          <div class="ui-scrollbar ui-team-scores__scores ui-team-scores-scores">
            <span class="ui-game-scores--size-m ui-game-scores--theme-gray-100 ui-game-scores">
              <span class="ui-game-scores__item ui-game-scores__item--total"><span class="ui-game-scores__num">82</span><span class="ui-game-scores__num">65</span></span>
              <span class="ui-game-scores__item ui-game-scores__item--current"><span class="ui-game-scores__num">38</span><span class="ui-game-scores__num">21</span></span>
              <span class="ui-game-scores__item"><span class="ui-game-scores__num">27</span><span class="ui-game-scores__num">28</span></span>
              <span class="ui-game-scores__item"><span class="ui-game-scores__num">17</span><span class="ui-game-scores__num">16</span></span>
            </span>
          </div>
        </span>
      </span>
    </a>
  </div>
</li>
`;

const bookmakerPageParsed = parseBookmakerLivePageHtml(bookmakerPageFixture, 2496666, "https://melbet.com");
assert.equal(bookmakerPageParsed.games.length, 1);
assert.equal(bookmakerPageParsed.unmatched.length, 0);
assert.equal(bookmakerPageParsed.games[0].team1.shortName, "Krasnodar");
assert.equal(bookmakerPageParsed.games[0].team2.shortName, "Tyumen");
assert.equal(bookmakerPageParsed.games[0].scoreText, "82 : 65");
assert.equal(bookmakerPageParsed.games[0].period, 3);
assert.equal(bookmakerPageParsed.games[0].statusDisplay, "3rd quarter");

console.log("Bookmaker page parsing tests passed");

const bookmakerSource = { name: "melbet", baseUrl: "https://melbet.com", partner: 8 };
const rejectedHtml = `
<li class="dashboard-game--theme-gray-100 dashboard-game dashboard-champ__game">
  <div class="dashboard-game-block">
    <a href="/en/live/basketball/2496666-ipbl-pro-division/730426124-ulan-ude-khabarovsk" class="dashboard-game-block__link">
      <span class="ui-team-scores--size-m ui-team-scores--theme-gray-100 ui-team-scores dashboard-game-block__teams">
        <span class="ui-team-scores__top">
          <span class="ui-team-scores__teams ui-team-scores-teams">
            <div class="dashboard-game-team-info dashboard-game-block__team"><div class="ui-team-score-name--nowrap ui-team-score-name"><span class="ui-caption--size-m ui-caption dashboard-game-team-info__name">Ulan-Ude</span></div></div>
            <div class="dashboard-game-team-info dashboard-game-block__team"><div class="ui-team-score-name--nowrap ui-team-score-name"><span class="ui-caption--size-m ui-caption dashboard-game-team-info__name">Khabarovsk</span></div></div>
          </span>
          <div class="ui-scrollbar ui-team-scores__scores ui-team-scores-scores">
            <span class="ui-game-scores--size-m ui-game-scores--theme-gray-100 ui-game-scores">
              <span class="ui-game-scores__item ui-game-scores__item--total"><span class="ui-game-scores__num">77</span><span class="ui-game-scores__num">81</span></span>
            </span>
          </div>
        </span>
      </span>
    </a>
  </div>
</li>
`;
const rejectedParsed = parseBookmakerLivePageHtml(rejectedHtml, 2496666, "https://melbet.com");
const rejectedFailure = classifyBookmakerSourceFailure(bookmakerSource, 2496666, rejectedHtml, rejectedParsed, null);
assert.equal(rejectedFailure.kind, "zero_approved_games");
assert.equal(rejectedFailure.source, "melbet");

const emptyParsed = parseBookmakerLivePageHtml("", 2496666, "https://melbet.com");
const parseFailure = classifyBookmakerSourceFailure(bookmakerSource, 2496666, "", emptyParsed, null);
assert.equal(parseFailure.kind, "parse_failed");

const fetchFailure = classifyBookmakerSourceFailure(bookmakerSource, 2496666, null, null, new Error("HTTP 403"));
assert.equal(fetchFailure.kind, "fetch_failed");
assert.equal(fetchFailure.error, "HTTP 403");
