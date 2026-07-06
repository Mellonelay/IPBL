import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync("src/App.tsx", "utf8");
const appTypesSource = fs.readFileSync("src/app/app-types.ts", "utf8");
const gameDrawerSource = fs.readFileSync("src/app/GameDrawer.tsx", "utf8");
const liveTabSource = fs.readFileSync("src/app/LiveTab.tsx", "utf8");

assert.equal(
  appSource.includes("fetchGameReplay"),
  false,
  "live drawer should not fetch replay data in App.tsx"
);
assert.equal(
  appSource.includes("fetchTeamGames"),
  false,
  "live drawer should not fetch team history for H2H in App.tsx"
);
assert.equal(
  appSource.includes("computeH2H"),
  false,
  "live drawer should not compute H2H in App.tsx"
);
assert.equal(
  appTypesSource.includes("replay:"),
  false,
  "DrawerState should not store replay data"
);
assert.equal(
  appTypesSource.includes("h2h:"),
  false,
  "DrawerState should not store H2H data"
);
assert.equal(
  appTypesSource.includes("replayErr:"),
  false,
  "DrawerState should not track replay load errors"
);
assert.equal(
  gameDrawerSource.includes("<h3>Odds movement</h3>"),
  false,
  "live drawer should not render the long odds replay section by default"
);
assert.equal(
  gameDrawerSource.includes("<h3>H2H block</h3>"),
  false,
  "live drawer should not render the long H2H dump by default"
);
assert.equal(
  gameDrawerSource.includes("<h3>Team risk block</h3>"),
  false,
  "live drawer should not render the team risk dump by default"
);
assert.equal(
  gameDrawerSource.includes("<h3>Matchup risk block</h3>"),
  false,
  "live drawer should not render the matchup risk dump by default"
);
assert.match(
  gameDrawerSource,
  /Intelligence handoff/,
  "live drawer should route the operator into Intelligence for deeper detail"
);
assert.match(
  liveTabSource,
  /Intelligence/,
  "live tab should expose an Intelligence jump from the live surface"
);

console.log("Live drawer policy checks passed");
