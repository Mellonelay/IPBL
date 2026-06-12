import type { LiveSourceStatus, RecorderRun } from "./live-recorder.js";

export const SOURCE_HEALTH_POLICY = {
  schedulerCadenceSeconds: 60,
  freshWithinSeconds: 90,
  staleAfterSeconds: 150,
  failedAfterSeconds: 300,
  recentRunWindow: 30,
  maxHealthyGapSeconds: 150,
  warningAfterConsecutivePartialRuns: 5,
  criticalAfterConsecutiveFailedRuns: 3,
  recoveryAfterConsecutiveNonFailedRuns: 2,
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
export type AlertSeverity = "NONE" | "WARNING" | "CRITICAL";
export type RecoveryState = "STABLE" | "INCIDENT" | "RECOVERING" | "RECOVERED" | "UNKNOWN";
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
    upstreamHttpStatuses: number[];
    bookmakerFailureCount: number;
    unmatchedEventCount: number;
    unmatchedByReason: Record<string, number>;
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
    consecutiveFailedRuns: number;
    consecutivePartialRuns: number;
    consecutiveNonFailedRuns: number;
  };
  alert: {
    severity: AlertSeverity;
    shouldNotify: boolean;
    code: string;
    incidentStartedAt: string | null;
    thresholdRuns: number | null;
    recommendedAction: string;
  };
  recovery: {
    state: RecoveryState;
    lastFailureAt: string | null;
    consecutiveNonFailedRuns: number;
    requiredNonFailedRuns: number;
  };
  continuity: {
    policy: "retain_last_known_active_set_on_source_fail";
    activeSetMutationSuppressedOnSourceFail: true;
    preservedActiveGameCount: number;
    preservedActiveGameKeys: string[];
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

function trailingCount(runs: RecorderRun[], predicate: (run: RecorderRun) => boolean): number {
  let count = 0;
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    if (!predicate(runs[index])) break;
    count += 1;
  }
  return count;
}

function unmatchedReasons(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr(value)) {
    const reason = text(rec(item)?.reason) ?? "unknown";
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function upstreamStatuses(value: unknown): number[] {
  const statuses = new Set<number>();
  for (const item of arr(value)) {
    const match = text(rec(item)?.error)?.match(/\bHTTP\s+(\d{3})\b/i);
    if (match) statuses.add(Number(match[1]));
  }
  return [...statuses].sort((a, b) => a - b);
}

export function evaluateRecorderHealth(
  statusValue: unknown,
  recentRunValues: unknown[],
  nowMs = Date.now(),
  activeGameKeyValues: unknown[] = [],
): RecorderHealth {
  const status = parseStoredRecord<RecorderStatusRecord>(statusValue);
  const details = rec(status?.sourceDetails) ?? {};
  const runs = recentRunValues
    .map((value) => parseStoredRecord<RecorderRun>(value))
    .filter((value): value is RecorderRun => value !== null && timestamp(value.capturedAt) !== null)
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));

  const lastCapturedAt = text(status?.capturedAt);
  const lastCapturedMs = timestamp(lastCapturedAt);
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
  const statusOf = (run: RecorderRun) => String(run.sourceStatus ?? "").toUpperCase();
  const okRuns = runs.filter((run) => statusOf(run) === "OK").length;
  const partialRuns = runs.filter((run) => statusOf(run) === "PARTIAL").length;
  const failedRuns = runs.filter((run) => statusOf(run) === "FAIL").length;
  const consecutiveFailedRuns = trailingCount(runs, (run) => statusOf(run) === "FAIL");
  const consecutivePartialRuns = trailingCount(runs, (run) => statusOf(run) === "PARTIAL");
  const consecutiveNonFailedRuns = trailingCount(runs, (run) => statusOf(run) !== "FAIL");
  const lastFailure = [...runs].reverse().find((run) => statusOf(run) === "FAIL") ?? null;
  const incidentStartedAt = consecutiveFailedRuns > 0 ? runs[runs.length - consecutiveFailedRuns]?.capturedAt ?? null : null;

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

  let alertSeverity: AlertSeverity = "NONE";
  let alertCode = "none";
  let thresholdRuns: number | null = null;
  let recommendedAction = "continue_monitoring";
  if (level === "UNKNOWN") {
    alertSeverity = "WARNING";
    alertCode = "recorder_state_unknown";
    recommendedAction = "verify_recorder_storage_and_status_key";
  } else if (ageSeconds !== null && ageSeconds > SOURCE_HEALTH_POLICY.failedAfterSeconds) {
    alertSeverity = "CRITICAL";
    alertCode = "recorder_heartbeat_expired";
    recommendedAction = "verify_scheduler_service_and_recorder_endpoint";
  } else if (consecutiveFailedRuns >= SOURCE_HEALTH_POLICY.criticalAfterConsecutiveFailedRuns) {
    alertSeverity = "CRITICAL";
    alertCode = "sustained_source_failure";
    thresholdRuns = SOURCE_HEALTH_POLICY.criticalAfterConsecutiveFailedRuns;
    recommendedAction = "investigate_official_upstream_and_quarantined_fallback_identities";
  } else if (reportedStatus === "FAIL") {
    alertSeverity = "WARNING";
    alertCode = "source_failure_observed";
    thresholdRuns = SOURCE_HEALTH_POLICY.criticalAfterConsecutiveFailedRuns;
    recommendedAction = "observe_until_critical_threshold_or_source_recovery";
  } else if (consecutivePartialRuns >= SOURCE_HEALTH_POLICY.warningAfterConsecutivePartialRuns) {
    alertSeverity = "WARNING";
    alertCode = "sustained_partial_source";
    thresholdRuns = SOURCE_HEALTH_POLICY.warningAfterConsecutivePartialRuns;
    recommendedAction = "review_fallback_coverage_and_unmatched_identity_quarantine";
  } else if (level === "STALE" || level === "DEGRADED") {
    alertSeverity = "WARNING";
    alertCode = level === "STALE" ? "recorder_heartbeat_stale" : "source_degraded";
    recommendedAction = "continue_bounded_monitoring";
  }

  let recoveryState: RecoveryState = "STABLE";
  if (!status) recoveryState = "UNKNOWN";
  else if (level === "FAILED" || level === "STALE") recoveryState = "INCIDENT";
  else if (lastFailure) recoveryState = consecutiveNonFailedRuns >= SOURCE_HEALTH_POLICY.recoveryAfterConsecutiveNonFailedRuns ? "RECOVERED" : "RECOVERING";

  const preservedActiveGameKeys = [...new Set(activeGameKeyValues.map(text).filter((value): value is string => value !== null))].sort();
  return {
    schemaVersion: 1,
    evaluatedAt: new Date(nowMs).toISOString(),
    level,
    reasons,
    freshness: {
      lastCapturedAt,
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
      upstreamHttpStatuses: upstreamStatuses(details.failures),
      bookmakerFailureCount,
      unmatchedEventCount,
      unmatchedByReason: unmatchedReasons(details.unmatchedBookmakerEvents),
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
      consecutiveFailedRuns,
      consecutivePartialRuns,
      consecutiveNonFailedRuns,
    },
    alert: {
      severity: alertSeverity,
      shouldNotify: alertSeverity !== "NONE",
      code: alertCode,
      incidentStartedAt,
      thresholdRuns,
      recommendedAction,
    },
    recovery: {
      state: recoveryState,
      lastFailureAt: lastFailure?.capturedAt ?? null,
      consecutiveNonFailedRuns,
      requiredNonFailedRuns: SOURCE_HEALTH_POLICY.recoveryAfterConsecutiveNonFailedRuns,
    },
    continuity: {
      policy: "retain_last_known_active_set_on_source_fail",
      activeSetMutationSuppressedOnSourceFail: true,
      preservedActiveGameCount: preservedActiveGameKeys.length,
      preservedActiveGameKeys,
    },
    storage: RECORDER_RETENTION_POLICY,
    evidenceLevel: 4,
  };
}
