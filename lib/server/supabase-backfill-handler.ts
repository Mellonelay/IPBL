import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildBackfillSegmentCommit } from "./ipbl-backfill-normalize.js";
import {
  claimBackfillSegments,
  commitBackfillSegment,
  failBackfillSegment,
  getBackfillStatus,
  isIpblBackfillConfigured,
  startBackfillRun,
  type BackfillSegmentLease,
} from "./ipbl-supabase-worker.js";
import { fetchOfficialCalendarEvidenceForDay } from "./ingest-results-month.js";
import { isApprovedResultsTag } from "./results-sync-constants.js";

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function bodyRecord(req: VercelRequest): Record<string, unknown> {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {};
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = [...new Set(value.filter((entry): entry is string => typeof entry === "string"))];
  if (tags.some((tag) => !isApprovedResultsTag(tag))) throw new Error("invalid_division_tag");
  return tags;
}

function safeFailure(error: unknown): { code: string; message: string; retryable: boolean } {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "AbortError") return { code: "source_timeout", message: "Official source request timed out.", retryable: true };
  const status = message.match(/calendar\s+(\d{3})/i)?.[1];
  if (status && ["400", "401", "403", "404"].includes(status)) {
    return { code: `source_http_${status}`, message: "Official source rejected the segment request.", retryable: false };
  }
  if (status) return { code: `source_http_${status}`, message: "Official source is temporarily unavailable.", retryable: true };
  return { code: "source_error", message: "Official source processing failed.", retryable: true };
}
async function processSegment(
  segment: BackfillSegmentLease,
  workerId: string
): Promise<Record<string, unknown>> {
  try {
    const evidence = await fetchOfficialCalendarEvidenceForDay(
      segment.division_tag,
      segment.window_start,
      { timeoutMs: 25_000 }
    );
    const payload = buildBackfillSegmentCommit(evidence);
    return await commitBackfillSegment({
      segmentId: segment.segment_id,
      workerId,
      payload,
    });
  } catch (error) {
    const failure = safeFailure(error);
    const result = await failBackfillSegment({
      segmentId: segment.segment_id,
      workerId,
      errorCode: failure.code,
      safeMessage: failure.message,
      retryable: failure.retryable,
    });
    return { ...result, error: failure.code };
  }
}

async function processClaimedSegments(
  segments: BackfillSegmentLease[],
  workerId: string
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  for (let index = 0; index < segments.length; index += 3) {
    results.push(...await Promise.all(
      segments.slice(index, index + 3).map((segment) => processSegment(segment, workerId))
    ));
  }
  return results;
}
function runKind(value: unknown): "last_30_days" | "current_season" | "historical" | "reconciliation" {
  const normalized = String(value ?? "last_30_days");
  if (["last_30_days", "current_season", "historical", "reconciliation"].includes(normalized)) {
    return normalized as "last_30_days" | "current_season" | "historical" | "reconciliation";
  }
  throw new Error("invalid_run_kind");
}

function positiveLimit(value: unknown, fallback = 6): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(Math.floor(parsed), 6)) : fallback;
}

export async function handleSupabaseBackfillRequest(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!isIpblBackfillConfigured()) {
    res.status(503).json({ ok: false, error: "backfill_not_configured" });
    return;
  }

  const body = bodyRecord(req);
  const action = queryValue(req.query.action) ?? String(body.action ?? "status");
  try {
    if (action === "start") {
      if (req.method !== "POST") throw new Error("method_not_allowed");
      if (!isIsoDate(body.from) || !isIsoDate(body.to)) throw new Error("invalid_date_range");
      const runId = await startBackfillRun({
        runKind: runKind(body.runKind),
        from: body.from,
        to: body.to,
        divisionTags: stringArray(body.divisionTags),
        requestedBy: "vercel-admin-route",
      });
      res.status(201).json({ ok: true, runId, status: await getBackfillStatus(runId) });
      return;
    }

    if (action === "work") {
      if (req.method !== "POST") throw new Error("method_not_allowed");
      const runId = String(body.runId ?? "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new Error("invalid_run_id");
      const workerId = `vercel:${process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_URL ?? "local"}:${randomUUID().slice(0, 8)}`;
      const segments = await claimBackfillSegments({
        runId,
        workerId,
        limit: positiveLimit(body.limit),
        leaseSeconds: 300,
      });
      const results = await processClaimedSegments(segments, workerId);
      res.status(200).json({
        ok: true,
        workerId,
        claimed: segments.length,
        results,
        status: await getBackfillStatus(runId),
      });
      return;
    }

    if (action === "status") {
      const runId = String(queryValue(req.query.runId) ?? body.runId ?? "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new Error("invalid_run_id");
      res.status(200).json({ ok: true, status: await getBackfillStatus(runId) });
      return;
    }

    throw new Error("invalid_action");
  } catch (error) {
    const code = error instanceof Error ? error.message.split(":")[0] : "backfill_error";
    const clientErrors = new Set([
      "invalid_action",
      "invalid_date_range",
      "invalid_division_tag",
      "invalid_run_id",
      "invalid_run_kind",
      "method_not_allowed",
    ]);
    res.status(clientErrors.has(code) ? 400 : 500).json({ ok: false, error: code });
  }
}
