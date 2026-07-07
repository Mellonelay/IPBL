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
  true,
  "live drawer should fetch team history for the compact H2H card"
);
assert.equal(
  appSource.includes("computeH2H"),
  true,
  "live drawer should compute the compact H2H summary in App.tsx"
);
assert.equal(
  appTypesSource.includes("replay:"),
  false,
  "DrawerState should not store replay data"
);
assert.equal(
  appTypesSource.includes("h2h:"),
  true,
  "DrawerState should store compact H2H data"
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
  true,
  "live drawer should render the compact H2H card by default"
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
assert.doesNotMatch(
  gameDrawerSource,
  /Detailed replay, H2H, team-risk, and matchup-risk review now lives in the Intelligence tab\./,
  "live drawer handoff copy should no longer claim H2H lives only in Intelligence"
);
assert.match(
  liveTabSource,
  /Intelligence/,
  "live tab should expose an Intelligence jump from the live surface"
);

console.log("Live drawer policy checks passed");
