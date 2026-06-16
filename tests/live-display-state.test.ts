import assert from "node:assert/strict";
import { buildLiveDisplayInsights } from "../src/live/display.ts";

type Game = {
  gameId: number;
  tag: string;
  scoreText: string;
};

type Insight = {
  game: Game;
  decision: string;
};

const oldGame = {
  gameId: 729342100,
  tag: "ipbl-66-m-pro-a",
  scoreText: "7 : 2",
};

const freshGame = {
  ...oldGame,
  scoreText: "23 : 18",
};

const display = buildLiveDisplayInsights<Game, Insight>({
  games: [freshGame],
  insights: {
    "ipbl-66-m-pro-a:729342100": {
      game: oldGame,
      decision: "ALLOW",
    },
  },
  selectedDivisionTag: "",
  keyForGame: (game) => `${game.tag}:${game.gameId}`,
});

assert.equal(display.length, 1);
assert.equal(display[0].decision, "ALLOW");
assert.equal(display[0].game.scoreText, "23 : 18");
assert.equal(display[0].game, freshGame);
assert.notEqual(display[0].game.scoreText, oldGame.scoreText);

const staleOtherDivisionGame = {
  gameId: 111,
  tag: "ipbl-66-w-pro-a",
  scoreText: "1 : 1",
};

const freshOtherDivisionGame = {
  ...staleOtherDivisionGame,
  scoreText: "10 : 12",
};

const filteredDisplay = buildLiveDisplayInsights<Game, Insight>({
  games: [freshGame, freshOtherDivisionGame],
  insights: {
    "ipbl-66-m-pro-a:729342100": {
      game: oldGame,
      decision: "ALLOW",
    },
    "ipbl-66-w-pro-a:111": {
      game: staleOtherDivisionGame,
      decision: "WATCH",
    },
  },
  selectedDivisionTag: "ipbl-66-m-pro-a",
  keyForGame: (game) => `${game.tag}:${game.gameId}`,
});

assert.equal(filteredDisplay.length, 1);
assert.equal(filteredDisplay[0].decision, "ALLOW");
assert.equal(filteredDisplay[0].game, freshGame);
assert.equal(filteredDisplay[0].game.scoreText, "23 : 18");

console.log("Live display state freshness tests passed");
