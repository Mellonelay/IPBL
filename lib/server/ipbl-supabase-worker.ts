import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type BackfillSegmentLease = {
  segment_id: string;
  division_tag: string;
  window_start: string;
  window_end: string;
  attempt_count: number;
};

export type BackfillSegmentCommit = {
  observations: unknown[];
  games: unknown[];
  periods: unknown[];
  metrics: Record<string, unknown>;
};

export type BackfillStatus = {
  run: {
    id: string;
    kind: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    segment_count: number;
    verified_segment_count: number;
    quarantined_segment_count: number;
  };
  segments: Record<string, number>;
  data: {
    games: number;
    periods: number;
    observations: number;
    failures: number;
  };
  divisions: Array<{
    tag: string;
    segments: number;
    verified: number;
    quarantined: number;
    games: number;
  }>;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function workerSecret(): string {
  return requiredEnv("CRON_SECRET");
}

let client: SupabaseClient | null = null;
export function isIpblBackfillConfigured(): boolean {
  return Boolean(
    process.env.IPBL_SUPABASE_URL?.trim()
    && process.env.IPBL_SUPABASE_PUBLISHABLE_KEY?.trim()
    && process.env.CRON_SECRET?.trim()
  );
}

export function getIpblBackfillClient(): SupabaseClient {
  if (client) return client;
  client = createClient(
    requiredEnv("IPBL_SUPABASE_URL"),
    requiredEnv("IPBL_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "ipbl-backfill-worker/1" } },
    }
  );
  return client;
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const supabase = getIpblBackfillClient();
  const { data, error } = await (supabase.rpc as any)(name, args);
  if (error) {
    const safeCode = typeof error.code === "string" ? error.code : "supabase_rpc_error";
    throw new Error(`${name}:${safeCode}`);
  }
  return data as T;
}

export async function startBackfillRun(input: {
  runKind: "last_30_days" | "current_season" | "historical" | "reconciliation";
  from: string;
  to: string;
  divisionTags?: string[];
  requestedBy?: string;
}): Promise<string> {
  return rpc<string>("ipbl_start_backfill", {
    p_secret: workerSecret(),
    p_run_kind: input.runKind,
    p_from: input.from,
    p_to: input.to,
    p_division_tags: input.divisionTags?.length ? input.divisionTags : null,
    p_requested_by: input.requestedBy ?? "vercel",
    p_normalizer_version: "official-calendar-v1",
    p_evidence_version: 1,
  });
}

export async function claimBackfillSegments(input: {
  runId: string;
  workerId: string;
  limit?: number;
  leaseSeconds?: number;
}): Promise<BackfillSegmentLease[]> {
  const rows = await rpc<BackfillSegmentLease[] | null>("ipbl_claim_backfill_segments", {
    p_secret: workerSecret(),
    p_run_id: input.runId,
    p_worker_id: input.workerId,
    p_limit: input.limit ?? 6,
    p_lease_seconds: input.leaseSeconds ?? 300,
  });
  return rows ?? [];
}

export async function commitBackfillSegment(input: {
  segmentId: string;
  workerId: string;
  payload: BackfillSegmentCommit;
}): Promise<Record<string, unknown>> {
  return rpc<Record<string, unknown>>("ipbl_commit_backfill_segment", {
    p_secret: workerSecret(),
    p_segment_id: input.segmentId,
    p_worker_id: input.workerId,
    p_observations: input.payload.observations,
    p_games: input.payload.games,
    p_periods: input.payload.periods,
    p_metrics: input.payload.metrics,
  });
}

export async function failBackfillSegment(input: {
  segmentId: string;
  workerId: string;
  errorCode: string;
  safeMessage: string;
  retryable?: boolean;
}): Promise<Record<string, unknown>> {
  return rpc<Record<string, unknown>>("ipbl_fail_backfill_segment", {
    p_secret: workerSecret(),
    p_segment_id: input.segmentId,
    p_worker_id: input.workerId,
    p_error_code: input.errorCode,
    p_safe_message: input.safeMessage,
    p_retryable: input.retryable ?? true,
  });
}

export async function getBackfillStatus(runId: string): Promise<BackfillStatus> {
  return rpc<BackfillStatus>("ipbl_backfill_status", {
    p_secret: workerSecret(),
    p_run_id: runId,
  });
}

export async function getWorkerTeamHistory(input: {
  teamId: number;
  divisionTag: string;
  limit?: number;
}): Promise<unknown[]> {
  return rpc<unknown[]>("ipbl_team_history_worker", {
    p_secret: workerSecret(),
    p_team_id: input.teamId,
    p_division_tag: input.divisionTag,
    p_limit: input.limit ?? 1000,
  });
}
