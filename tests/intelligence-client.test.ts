import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadIntelligenceSurface } from "../src/app/intelligence-client.ts";

const approvedLiveDivisionCount = 14;

const snapshot = await loadIntelligenceSurface(async (url) => {
  if (url.endsWith("/api/gen-analysis")) {
    return new Response(JSON.stringify({
      source: "api/gen-analysis",
      generatedAt: "2026-07-05T12:00:00.000Z",
      bettingRecord: { totalBets: 14 },
      worker: {
        synthesis: {
          summary: "Graphify recommends monitoring late-market movement.",
          fallback: false,
          nextAction: "Review quarter-state drift before lock.",
        },
        storedAt: "2026-07-05T12:00:05.000Z",
      },
      analysisEngine: {
        schema: "ipbl.analysis-engine.v1",
        status: "materialized",
        skills: [{ name: "graphify-intent" }, { name: "graphify-temporal" }],
      },
      operatorIntelligence: {
        schema: "ipbl.operator-intelligence.v1",
        phase: 12,
        status: "seeded",
        evidence: {
          recorder: { coverage: "14/14 divisions" },
          h2h: { coverage: "complete" },
          odds: { coverage: "partial" },
        },
      },
    }));
  }
  if (url.endsWith("/api/predictions/live")) {
    return new Response(JSON.stringify({
      source: "api/predictions/live",
      generatedAt: "2026-07-05T12:00:10.000Z",
      count: 3,
      summary: {
        liveStates: { late: 1, locked: 2 },
        averageConfidence: 0.64,
        averageCalibratedConfidence: 0.59,
        driftState: "stable",
      },
    }));
  }
  if (url.endsWith("/api/recorder?mode=health")) {
    return new Response(JSON.stringify({
      status: {
        capturedAt: "2026-07-05T12:00:20.000Z",
        source: "ipbl-live-source",
        sourceStatus: "OK",
      },
      activeGameKeys: Array.from({ length: approvedLiveDivisionCount }, (_, index) => `game:${index + 1}`),
      runRows: [
        { capturedAt: "2026-07-05T11:58:20.000Z", sourceStatus: "OK" },
        { capturedAt: "2026-07-05T11:59:20.000Z", sourceStatus: "OK" },
      ],
      health: {
        schemaVersion: 1,
        evaluatedAt: "2026-07-05T12:00:30.000Z",
        level: "HEALTHY",
        reasons: ["canonical_division_coverage"],
        freshness: {
          lastCapturedAt: "2026-07-05T12:00:20.000Z",
          ageSeconds: 10,
          freshWithinSeconds: 90,
          staleAfterSeconds: 150,
          failedAfterSeconds: 300,
        },
        source: {
          name: "ipbl-live-source",
          reportedStatus: "OK",
          fallbackActive: false,
          fallbackFrom: null,
          requestedDivisions: approvedLiveDivisionCount,
          successfulDivisions: approvedLiveDivisionCount,
          coverageRatio: 1,
          upstreamFailureCount: 0,
          upstreamHttpStatuses: [],
          bookmakerFailureCount: 0,
          unmatchedEventCount: 0,
          unmatchedByReason: {},
          receivedBookmakerEvents: 14,
          latencyMs: 420,
        },
        scheduler: {
          cadenceSeconds: 60,
          recentRunCount: 2,
          firstRunAt: "2026-07-05T11:58:20.000Z",
          lastRunAt: "2026-07-05T11:59:20.000Z",
          maxObservedGapSeconds: 60,
          okRuns: 2,
          partialRuns: 0,
          failedRuns: 0,
          consecutiveFailedRuns: 0,
          consecutivePartialRuns: 0,
          consecutiveNonFailedRuns: 2,
        },
        alert: {
          severity: "NONE",
          shouldNotify: false,
          code: "none",
          incidentStartedAt: null,
          thresholdRuns: null,
          recommendedAction: "continue_monitoring",
        },
        recovery: {
          state: "STABLE",
          lastFailureAt: null,
          consecutiveNonFailedRuns: 2,
          requiredNonFailedRuns: 2,
        },
        continuity: {
          policy: "retain_last_known_active_set_on_source_fail",
          activeSetMutationSuppressedOnSourceFail: true,
          preservedActiveGameCount: approvedLiveDivisionCount,
          preservedActiveGameKeys: Array.from({ length: approvedLiveDivisionCount }, (_, index) => `game:${index + 1}`),
        },
        storage: {
          prefix: "ipbl:recorder:v1",
          maxSnapshotsPerTimeline: 1440,
          perGameTtlSeconds: 2592000,
          runsMaxEntries: 1440,
          runsTtlSeconds: null,
          statusTtlSeconds: null,
          activeSetTtlSeconds: null,
          dedupeFingerprintFields: ["status", "source"],
        },
        evidenceLevel: 4,
      },
    }));
  }
  throw new Error(`unexpected url ${url}`);
});

assert.equal(snapshot.genAnalysis.worker?.synthesis?.summary, "Graphify recommends monitoring late-market movement.");
assert.equal(snapshot.genAnalysis.worker?.synthesis?.nextAction, "Review quarter-state drift before lock.");
assert.equal(snapshot.genAnalysis.bettingRecord?.totalBets, 14);

assert.equal(snapshot.predictionRuntime.count, 3);
assert.equal(snapshot.predictionRuntime.summary?.driftState, "stable");
assert.equal(snapshot.predictionRuntime.summary?.liveStates?.late, 1);

assert.equal(snapshot.recorderHealth.health?.level, "HEALTHY");
assert.equal(snapshot.recorderHealth.health?.source?.reportedStatus, "OK");
assert.equal(snapshot.recorderHealth.health?.source?.coverageRatio, 1);
assert.equal(snapshot.recorderHealth.health?.source?.requestedDivisions, approvedLiveDivisionCount);
assert.equal(snapshot.recorderHealth.health?.source?.successfulDivisions, approvedLiveDivisionCount);
assert.equal(snapshot.recorderHealth.health?.alert?.code, "none");
assert.equal(snapshot.recorderHealth.health?.alert?.severity, "NONE");
assert.equal(snapshot.recorderHealth.health?.alert?.shouldNotify, false);
assert.equal(snapshot.recorderHealth.health?.continuity?.preservedActiveGameCount, approvedLiveDivisionCount);
assert.equal(snapshot.recorderHealth.health?.continuity?.preservedActiveGameKeys?.length, approvedLiveDivisionCount);
assert.equal(snapshot.recorderHealth.activeGameKeys?.length, approvedLiveDivisionCount);

assert.equal(snapshot.analysisEngine.schema, "ipbl.analysis-engine.v1");
assert.equal(snapshot.analysisEngine.status, "materialized");
assert.equal(snapshot.analysisEngine.skills?.length, 2);
assert.deepEqual(snapshot.analysisEngine.skills?.map((skill) => skill.name), ["graphify-intent", "graphify-temporal"]);

assert.equal(snapshot.operatorIntelligence.schema, "ipbl.operator-intelligence.v1");
assert.equal(snapshot.operatorIntelligence.phase, 12);
assert.equal(snapshot.operatorIntelligence.evidence?.recorder?.coverage, "14/14 divisions");
assert.equal(snapshot.operatorIntelligence.evidence?.h2h?.coverage, "complete");
assert.equal(snapshot.operatorIntelligence.evidence?.odds?.coverage, "partial");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCard(markupText: string, title: string): string {
  const pattern = new RegExp(
    `<article class="operator-card">[\\s\\S]*?<div class="card-title">${escapeRegExp(title)}<\\/div>[\\s\\S]*?<\\/article>`
  );
  const match = markupText.match(pattern);
  assert(match, `missing "${title}" card`);
  return match[0];
}

function assertMetric(cardMarkup: string, label: string, value: string) {
  const pattern = new RegExp(
    `<div class="metric-box">[\\s\\S]*?<div class="metric-label">${escapeRegExp(label)}<\\/div>[\\s\\S]*?<div class="metric-value">${escapeRegExp(value)}<\\/div>[\\s\\S]*?<\\/div>`
  );
  assert.match(cardMarkup, pattern, `expected ${label} = ${value}`);
}

const tempDir = await fs.mkdtemp(path.join(process.cwd(), ".tmp-intelligence-tab-"));
const sharedSource = await fs.readFile(new URL("../src/app/shared.tsx", import.meta.url), "utf8");
const intelligenceTabSource = await fs.readFile(new URL("../src/app/IntelligenceTab.tsx", import.meta.url), "utf8");
const transpile = (source: string, fileName: string) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
  fileName,
}).outputText;

let markup = "";
try {
  await fs.writeFile(path.join(tempDir, "shared.mjs"), transpile(sharedSource, "shared.tsx"));
  await fs.writeFile(
    path.join(tempDir, "IntelligenceTab.mjs"),
    transpile(intelligenceTabSource, "IntelligenceTab.tsx")
      .replaceAll('from "./shared"', 'from "./shared.mjs"')
      .replaceAll('from "./intelligence-client"', `from ${JSON.stringify(new URL("../src/app/intelligence-client.ts", import.meta.url).href)}`),
  );

  const { default: IntelligenceTab } = await import(`file://${path.join(tempDir, "IntelligenceTab.mjs")}`);
  markup = renderToStaticMarkup(React.createElement(IntelligenceTab, {
    snapshot,
    loading: false,
    error: null,
  }));
  markup = renderToStaticMarkup(React.createElement(IntelligenceTab, {
    snapshot,
    loading: false,
    error: null,
    focus: {
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
    },
  } as never));
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

assert.match(markup, /Graphify recommends monitoring late-market movement\./);

const synthesisCard = extractCard(markup, "Graphify synthesis");
assertMetric(synthesisCard, "Fallback", "No");
assertMetric(synthesisCard, "Next action", "Review quarter-state drift before lock.");
assertMetric(synthesisCard, "Stored at", "2026-07-05T12:00:05.000Z");
assertMetric(synthesisCard, "Bets", "14");

const predictionCard = extractCard(markup, "Prediction runtime");
assertMetric(predictionCard, "Average confidence", "64.0%");
assertMetric(predictionCard, "Calibrated confidence", "59.0%");
assertMetric(predictionCard, "Late games", "1");
assertMetric(predictionCard, "Runtime source", "api/predictions/live");

const recorderCard = extractCard(markup, "Recorder health");
assertMetric(recorderCard, "Coverage", "100.0%");
assertMetric(recorderCard, "Unmatched events", "0");
assertMetric(recorderCard, "Active games", "14");
assertMetric(recorderCard, "Alert", "none");

const phaseCard = extractCard(markup, "Phase coverage");
assertMetric(phaseCard, "Analysis status", "materialized");
assertMetric(phaseCard, "Skills", "2");
assertMetric(phaseCard, "Recorder coverage", "14/14 divisions");
assertMetric(phaseCard, "H2H / odds", "complete / partial");
assert.match(markup, /H2H evidence/);
assert.match(markup, /Magnitogorsk vs Izhevsk/);
assert.match(markup, /Q1 42 · Q2 43 · Q3 41 · Q4 48/);
