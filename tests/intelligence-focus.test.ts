import assert from "node:assert/strict";
import { selectIntelligenceFocusGame } from "../src/app/intelligence-focus.ts";

const drawerGame = {
  gameId: 9001,
  tag: "ipbl-66-m-pro-a",
  localDate: "07.07.2026",
  localTime: "12:00",
} as never;

const liveGame = {
  gameId: 9002,
  tag: "ipbl-66-m-pro-a",
  localDate: "07.07.2026",
  localTime: "13:00",
} as never;

const resultsGame = {
  gameId: 9003,
  tag: "ipbl-66-m-pro-a",
  localDate: "07.07.2026",
  localTime: "14:00",
} as never;

assert.equal(
  selectIntelligenceFocusGame({
    drawerGame,
    liveGames: [liveGame],
    calendarMap: {
      "2026-07-07": [
        {
          date: "2026-07-07",
          division: "Pro Men A",
          divisionTag: "ipbl-66-m-pro-a",
          games: [
            {
              game: resultsGame,
              time: "14:00",
              teams: "Barnaul vs Sochi",
              score: "95 : 81",
              division: "Pro Men A",
              divisionTag: "ipbl-66-m-pro-a",
              quarterTotals: "Q1 46 · Q2 42 · Q3 44 · Q4 44",
            },
          ],
        },
      ],
    },
    selectedDivisionTag: "ipbl-66-m-pro-a",
  }),
  drawerGame,
  "drawer focus should win when it exists"
);

assert.equal(
  selectIntelligenceFocusGame({
    liveGames: [liveGame],
    calendarMap: {
      "2026-07-07": [
        {
          date: "2026-07-07",
          division: "Pro Men A",
          divisionTag: "ipbl-66-m-pro-a",
          games: [
            {
              game: resultsGame,
              time: "14:00",
              teams: "Barnaul vs Sochi",
              score: "95 : 81",
              division: "Pro Men A",
              divisionTag: "ipbl-66-m-pro-a",
              quarterTotals: "Q1 46 · Q2 42 · Q3 44 · Q4 44",
            },
          ],
        },
      ],
    },
    selectedDivisionTag: "ipbl-66-m-pro-a",
  }),
  liveGame,
  "live focus should win when no drawer focus exists"
);

assert.equal(
  selectIntelligenceFocusGame({
    liveGames: [],
    calendarMap: {
      "2026-07-07": [
        {
          date: "2026-07-07",
          division: "Pro Men A",
          divisionTag: "ipbl-66-m-pro-a",
          games: [
            {
              game: resultsGame,
              time: "14:00",
              teams: "Barnaul vs Sochi",
              score: "95 : 81",
              division: "Pro Men A",
              divisionTag: "ipbl-66-m-pro-a",
              quarterTotals: "Q1 46 · Q2 42 · Q3 44 · Q4 44",
            },
          ],
        },
      ],
    },
    selectedDivisionTag: "ipbl-66-m-pro-a",
  }),
  resultsGame,
  "results focus should win when no drawer or live focus exists"
);

console.log("intelligence focus selection test passed");
