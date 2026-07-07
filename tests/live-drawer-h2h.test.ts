import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const tempDir = await fs.mkdtemp(path.join(process.cwd(), ".tmp-live-drawer-h2h-"));
const sharedSource = await fs.readFile(new URL("../src/app/shared.tsx", import.meta.url), "utf8");
const gameDrawerSource = await fs.readFile(new URL("../src/app/GameDrawer.tsx", import.meta.url), "utf8");
const transpile = (source: string, fileName: string) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
  fileName,
}).outputText;

const gameDrawerTemp = path.join(tempDir, "GameDrawer.mjs");
const sharedTemp = path.join(tempDir, "shared.mjs");

try {
  await fs.writeFile(sharedTemp, transpile(sharedSource, "shared.tsx"));
  await fs.writeFile(
    gameDrawerTemp,
    transpile(gameDrawerSource, "GameDrawer.tsx")
      .replaceAll('from "./shared"', 'from "./shared.mjs"')
      .replaceAll('from "../config/divisions"', `from ${JSON.stringify(new URL("../src/config/divisions.ts", import.meta.url).href)}`)
      .replaceAll('from "../operator/data"', `from ${JSON.stringify(new URL("../src/operator/data.ts", import.meta.url).href)}`),
  );

  const { default: GameDrawer } = await import(`file://${gameDrawerTemp}`);
  const markup = renderToStaticMarkup(
    React.createElement(GameDrawer, {
      drawer: {
        game: {
          gameId: 1073420,
          tag: "ipbl-66-w-pro-a",
          status: "ResultConfirmed",
          statusDisplay: "Finished",
          upstreamStatusId: "ResultConfirmed",
          score1: 39,
          score2: 40,
          scoreText: "39 : 40",
          fullScore: "41:38",
          localDate: "06.07.2026",
          localTime: "16:25",
          divisionLabel: "Pro Women A",
          period: 2,
          timeToGo: null,
          timeIsGo: null,
          isLive: false,
          updatedAt: 1,
          scheduledTime: "2026-07-06T16:25:00+06:30",
          sourceLocalDate: "06.07.2026",
          sourceLocalTime: "16:25",
          sourceTimeZone: "UTC+06:30",
          displayTimeZone: "Asia/Yangon",
          team1: { teamId: 76020, shortName: "Magnitogorsk", name: "Magnitogorsk" },
          team2: { teamId: 76023, shortName: "Izhevsk", name: "Izhevsk" },
        },
        gameMeta: null,
        boxState: null,
        board: {
          quarterTotals: { Q1: 41, Q2: 38 },
          currentQuarter: "Q2",
          currentQuarterTotal: 38,
          quarterClock: null,
          firstHalfTotal: 79,
          secondHalfTotal: null,
          fullScoreTotal: 79,
        },
        flow: null,
        decision: {
          decision: "BLOCK",
          score: 0,
          reasons: [],
          suggestedBias: "UNDER",
          quarterContext: null,
          divisionContext: null,
          oddsContext: null,
          flow: null,
          teamFlags: [],
          matchupFlag: null,
        },
        h2h: [
          {
            gameId: 1,
            date: "05.07.2026",
            time: "16:00",
            scoreText: "88 : 86",
            fullScore: "22:20,21:22,23:18,22:26",
            quarterTotals: "Q1 42 · Q2 43 · Q3 41 · Q4 48",
            status: "ResultConfirmed",
            winner: 1,
            homeTeamId: 76020,
            awayTeamId: 76023,
          },
        ],
      } as never,
      onClose: () => undefined,
      onOpenIntelligence: () => undefined,
    })
  );

  assert.match(markup, /H2H block/);
  assert.match(markup, /Magnitogorsk vs Izhevsk/);
  assert.match(markup, /05\.07\.2026/);
  assert.match(markup, /Q1 42 · Q2 43 · Q3 41 · Q4 48/);
  console.log("Live drawer H2H block test passed");
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
