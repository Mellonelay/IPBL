import type { LiveSourceStatus, RecorderRun } from "./live-recorder.js";

export const SOURCE_HEALTH_POLICY = {
  schedulerCadenceSeconds: 60,
  freshWithinSeconds: 90,
  staleAfterSeconds: 150,
  failedAfterSeconds: 300,
  recentRunWindow: 30,
  maxHealthyGapSeconds: 150,
} as const;

export const RECORDER_RETENTION_POLICY = {
  prefix: "ipbl:recorder:v1",
  maxSnapshotsPerTimeline: 1440,
  perGameTtlSeconds: 30 * 24 * 60 * 60,
  runsMaxEntries: 1440,
  runsTtlSeconds: null,
  statusTtlSeconds: null,
  activeSetTtlSeconds: null,
  dedupeFingerprintFields: [
    "score1", "score2", "fullScore", "period", "timeToGo",
    "timeIsGo", "status", "isLive", "source",
  ],
} as const;

export type SourceHealthLevel = "HEALTHY" | "DEGRADED" | "STALE" | "FAILED" | "UNKNOWN";
export type RecorderStatusRecord = RecorderRun & { sourceDetails?: LiveSourceStatus };

export type RecorderHealth = {
  schemaVersion: 1;
  evaluatedAt: string;
  level: SourceHealthLevel;
  reasons: string[];
  freshness: {
    lastCapturedAt: string | null;
    ageSeconds: number | null;
    freshWithinSeconds: number;
    staleAfterSeconds: number;
    failedAfterSeconds: number;
  };
  source: {
    name: string | null;
    reportedStatus: string | null;
    fallbackActive: boolean;
    fallbackFrom: string | null;
    requestedDivisions: number | null;
    successfulDivisions: number | null;
    coverageRatio: number | null;
    upstreamFailureCount: number;
    bookmakerFailureCount: number;
    unmatchedEventCount: number;
    receivedBookmakerEvents: number | null;
    latencyMs: number | null;
  };
  scheduler: {
    cadenceSeconds: number;
    recentRunCount: number;
    firstRunAt: string | null;
    lastRunAt: string | null;
    maxObservedGapSeconds: number | null;
    okRuns: number;
    partialRuns: number;
    failedRuns: number;
  };
  storage: typeof RECORDER_RETENTION_POLICY;
  evidenceLevel: 4;
};

type R = Record<string, unknown>;
const rec = (value: unknown): R | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as R : null;
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

export function parseStoredRecord<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return typeof value === "object" ? value as T : null;
}

function timestamp(value: unknown): number | null {
  const candidate = text(value);
  if (!candidate) return null;
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function countArray(value: unknown): number { return arr(value).length; }

export function evaluateRecorderHealth(
  statusValue: unknown,
  recentRunValues: unknown[],
  nowMs = Date.now(),
): RecorderHealth {
  const status = parseStoredRecord<RecorderStatusRecord>(statusValue);
  const details = rec(status?.sourceDetails) ?? {};
  const runs = recentRunValues
    .map((value) => parseStoredRecord<RecorderRun>(value))
    .filter((value): value is RecorderRun => value !== null && timestamp(value.capturedAt) !== null)
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));

  const lastCapturedMs = timestamp(status?.capturedAt);
  const ageSeconds = lastCapturedMs === null ? null : Math.max(0, Math.floor((nowMs - lastCapturedMs) / 1000));
  const sourceName = text(status?.source);
  const reportedStatus = text(status?.sourceStatus)?.toUpperCase() ?? null;
  const fallbackFrom = text(details.fallbackFrom);
  const requestedDivisions = finite(details.requestedDivisions);
  const successfulDivisions = finite(details.successfulDivisions);
  const coverageRatio = requestedDivisions && successfulDivisions !== null
    ? Math.max(0, Math.min(1, successfulDivisions / requestedDivisions))
    : null;
  const upstreamFailureCount = countArray(details.failures);
  const bookmakerFailureCount = countArray(details.bookmakerSourceFailures);
  const unmatchedEventCount = countArray(details.unmatchedBookmakerEvents);

  const times = runs.map((run) => Date.parse(run.capturedAt));
  const gaps = times.slice(1).map((value, index) => Math.max(0, Math.round((value - times[index]) / 1000)));
  const maxObservedGapSeconds = gaps.length ? Math.max(...gaps) : null;
  const okRuns = runs.filter((run) => String(run.sourceStatus).toUpperCase() === "OK").length;
  const partialRuns = runs.filter((run) => String(run.sourceStatus).toUpperCase() === "PARTIAL").length;
  const failedRuns = runs.filter((run) => String(run.sourceStatus).toUpperCase() === "FAIL").length;

  const reasons: string[] = [];
  let level: SourceHealthLevel = "HEALTHY";
  if (!status || ageSeconds === null) {
    level = "UNKNOWN";
    reasons.push("recorder_status_missing");
  } else if (reportedStatus === "FAIL" || ageSeconds > SOURCE_HEALTH_POLICY.failedAfterSeconds) {
    level = "FAILED";
    if (reportedStatus === "FAIL") reasons.push("source_reported_fail");
    if (ageSeconds > SOURCE_HEALTH_POLICY.failedAfterSeconds) reasons.push("recorder_heartbeat_expired");
  } else if (ageSeconds > SOURCE_HEALTH_POLICY.staleAfterSeconds) {
    level = "STALE";
    reasons.push("recorder_heartbeat_stale");
  } else {
    if (ageSeconds > SOURCE_HEALTH_POLICY.freshWithinSeconds) reasons.push("recorder_heartbeat_delayed");
    if (reportedStatus === "PARTIAL") reasons.push("source_reported_partial");
    if (fallbackFrom) reasons.push("fallback_source_active");
    if (coverageRatio !== null && coverageRatio < 1) reasons.push("division_coverage_partial");
    if (upstreamFailureCount > 0) reasons.push("upstream_failures_present");
    if (bookmakerFailureCount > 0) reasons.push("bookmaker_failures_present");
    if (unmatchedEventCount > 0) reasons.push("unmatched_bookmaker_events_present");
    if (maxObservedGapSeconds !== null && maxObservedGapSeconds > SOURCE_HEALTH_POLICY.maxHealthyGapSeconds) reasons.push("scheduler_gap_detected");
    if (reasons.length > 0) level = "DEGRADED";
  }

  return {
    schemaVersion: 1,
    evaluatedAt: new Date(nowMs).toISOString(),
    level,
    reasons,
    freshness: {
      lastCapturedAt: status?.capturedAt ?? null,
      ageSeconds,
      freshWithinSeconds: SOURCE_HEALTH_POLICY.freshWithinSeconds,
      staleAfterSeconds: SOURCE_HEALTH_POLICY.staleAfterSeconds,
      failedAfterSeconds: SOURCE_HEALTH_POLICY.failedAfterSeconds,
    },
    source: {
      name: sourceName,
      reportedStatus,
      fallbackActive: Boolean(fallbackFrom),
      fallbackFrom,
      requestedDivisions,
      successfulDivisions,
      coverageRatio,
      upstreamFailureCount,
      bookmakerFailureCount,
      unmatchedEventCount,
      receivedBookmakerEvents: finite(details.receivedBookmakerEvents),
      latencyMs: finite(details.latencyMs),
    },
    scheduler: {
      cadenceSeconds: SOURCE_HEALTH_POLICY.schedulerCadenceSeconds,
      recentRunCount: runs.length,
      firstRunAt: runs[0]?.capturedAt ?? null,
      lastRunAt: runs.at(-1)?.capturedAt ?? null,
      maxObservedGapSeconds,
      okRuns,
      partialRuns,
      failedRuns,
    },
    storage: RECORDER_RETENTION_POLICY,
    evidenceLevel: 4,
  };
}
