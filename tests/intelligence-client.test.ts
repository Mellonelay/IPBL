import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadIntelligenceSurface } from "../src/app/intelligence-client.ts";

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
        sourceStatus: "PARTIAL",
      },
      activeGameKeys: ["game:1", "game:2"],
      runRows: [
        { capturedAt: "2026-07-05T11:58:20.000Z", sourceStatus: "OK" },
        { capturedAt: "2026-07-05T11:59:20.000Z", sourceStatus: "PARTIAL" },
      ],
      health: {
        schemaVersion: 1,
        evaluatedAt: "2026-07-05T12:00:30.000Z",
        level: "DEGRADED",
        reasons: ["source_reported_partial", "division_coverage_partial"],
        freshness: {
          lastCapturedAt: "2026-07-05T12:00:20.000Z",
          ageSeconds: 10,
          freshWithinSeconds: 90,
          staleAfterSeconds: 150,
          failedAfterSeconds: 300,
        },
        source: {
          name: "ipbl-live-source",
          reportedStatus: "PARTIAL",
          fallbackActive: false,
          fallbackFrom: null,
          requestedDivisions: 4,
          successfulDivisions: 3,
          coverageRatio: 0.75,
          upstreamFailureCount: 1,
          upstreamHttpStatuses: [502],
          bookmakerFailureCount: 1,
          unmatchedEventCount: 2,
          unmatchedByReason: { team_name_mismatch: 2 },
          receivedBookmakerEvents: 7,
          latencyMs: 480,
        },
        scheduler: {
          cadenceSeconds: 60,
          recentRunCount: 2,
          firstRunAt: "2026-07-05T11:58:20.000Z",
          lastRunAt: "2026-07-05T11:59:20.000Z",
          maxObservedGapSeconds: 60,
          okRuns: 1,
          partialRuns: 1,
          failedRuns: 0,
          consecutiveFailedRuns: 0,
          consecutivePartialRuns: 1,
          consecutiveNonFailedRuns: 2,
        },
        alert: {
          severity: "WARNING",
          shouldNotify: true,
          code: "source_degraded",
          incidentStartedAt: null,
          thresholdRuns: null,
          recommendedAction: "continue_bounded_monitoring",
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
          preservedActiveGameCount: 2,
          preservedActiveGameKeys: ["game:1", "game:2"],
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
  if (url.endsWith("/api/analysis-engine")) {
    return new Response(JSON.stringify({
      schema: "ipbl.analysis-engine.v1",
      status: "ready",
      skills: [{ name: "graphify" }, { name: "operator-intelligence" }],
    }));
  }
  if (url.endsWith("/api/operator-intelligence")) {
    return new Response(JSON.stringify({
      schema: "ipbl.operator-intelligence.v1",
      phase: 4,
      status: "monitoring",
      evidence: {
        recorder: { coverage: "3/4 divisions" },
        h2h: { coverage: "complete" },
        odds: { coverage: "partial" },
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

assert.equal(snapshot.recorderHealth.health?.level, "DEGRADED");
assert.equal(snapshot.recorderHealth.health?.source?.reportedStatus, "PARTIAL");
assert.equal(snapshot.recorderHealth.health?.source?.coverageRatio, 0.75);
assert.equal(snapshot.recorderHealth.health?.alert?.code, "source_degraded");
assert.equal(snapshot.recorderHealth.health?.continuity?.preservedActiveGameCount, 2);
assert.equal(snapshot.recorderHealth.activeGameKeys?.length, 2);

assert.equal(snapshot.analysisEngine.schema, "ipbl.analysis-engine.v1");
assert.equal(snapshot.analysisEngine.status, "ready");
assert.equal(snapshot.analysisEngine.skills?.length, 2);

assert.equal(snapshot.operatorIntelligence.schema, "ipbl.operator-intelligence.v1");
assert.equal(snapshot.operatorIntelligence.phase, 4);
assert.equal(snapshot.operatorIntelligence.evidence?.recorder?.coverage, "3/4 divisions");
assert.equal(snapshot.operatorIntelligence.evidence?.odds?.coverage, "partial");

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
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

assert.match(markup, /Graphify synthesis/);
assert.match(markup, /Prediction runtime/);
assert.match(markup, /Recorder health/);
assert.match(markup, /Phase coverage/);
assert.match(markup, /Graphify recommends monitoring late-market movement\./);
