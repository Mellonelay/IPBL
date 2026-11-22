# IPBL — one durable historical recovery campaign (2026-11-22)

## Existing authority and invariants
- Production source: official IPBL calendar with explicit league.tag, team IDs, official game IDs and source-local date; no Men X/Men A merge.
- Only the 14 approved `public.divisions` participate.
- Reuse `public.ipbl_start_backfill`, `backfill_runs`, `backfill_segments`, `ipbl_claim_backfill_segments` and the existing Vercel Supabase backfill endpoint.
- `private.ipbl_enqueue_reverse_historical` creates all windows in descending order; it does **not** run automatically merely because the migration is installed.
- Existing `ipbl-current-season-worker` cron dispatches daily/bulk work first, then historical windows, at up to 3 requests/minute and 3 segments/request. Empty/unresolved days remain quarantined; do not invent verified absence.

## Production safety gate — must be established before starting
1. Record exact Git SHA, deployment, migration versions and database counts for `games`, `game_periods`, `source_observations`, `backfill_runs`, `backfill_segments`, and unresolved `backfill_failures`.
2. Create and **verify an independent database backup / recoverable snapshot** of those tables; a migration-file rollback is not a game-data backup. Do not begin large writes if backup/restore cannot be independently demonstrated.
3. Snapshot current function definitions using `pg_get_functiondef` for `private.ipbl_dispatch_current_ingest` and `public.ipbl_commit_backfill_segment`, and verify zero active leases.
4. Review the new migrations before applying. Check function owner, grants, cron schedule, Vault secret availability *without displaying the secret*, Vercel authorization, rate limits, and available database/API quotas.
5. Run migration tests, full CI and a bounded production source readback. Applying a migration and enqueueing recovery are separate actions.

## Initiate one bounded campaign
After passing those gates, invoke from authorized Supabase SQL (not from an anonymous/public API):
```sql
SELECT private.ipbl_enqueue_reverse_historical(
  DATE '2026-11-01', DATE '2026-11-21', 7
);
```
This example is a **first campaign only**, not the earliest recoverable date. Campaign inputs exclude the current source-local date and are capped at 366 inclusive days. For earlier dates, enqueue the next nonoverlapping window after reconciling outcomes and proving the source's accessible range. A campaign includes all approved divisions, including days without stored games.

## Read-only progress and coverage
```sql
SELECT r.id,r.run_kind,r.status,r.started_at,r.segment_count,
       r.verified_segment_count,r.quarantined_segment_count,r.metadata
FROM public.backfill_runs r
WHERE r.requested_by='owner-historical-recovery'
ORDER BY (r.metadata->>'campaign_id'),(r.metadata->>'recovery_order')::integer;

SELECT d.tag,s.window_start,s.status,s.attempt_count,
       s.observed_game_count,s.accepted_game_count,
       s.quarantined_game_count,s.last_error_code,s.completed_at
FROM public.backfill_segments s JOIN public.divisions d ON d.id=s.division_id
JOIN public.backfill_runs r ON r.id=s.run_id
WHERE r.requested_by='owner-historical-recovery'
ORDER BY (r.metadata->>'campaign_id'),s.window_start DESC,d.tag;

SELECT jobname,active,schedule FROM cron.job
WHERE jobname IN ('ipbl-current-season-worker','ipbl-daily-incremental');
```
Run `scripts/ipbl-historical-coverage.sql` as a read-only query. Its earliest bound reflects **existing ledger coverage**, not the source's earliest available date. Reconcile individual source game IDs and quarter totals directly; count verified empty only when explicit proof is available.

## Failure handling
- Quarantined or max-attempt segments are preserved with their error codes; successful unrelated segments continue.
- An empty source payload is not automatically proof of no games.
- A run can remain marked `running` despite all claimable segments being terminal; inspect segment-level status rather than trusting only the run status.
- If dispatch is interrupted, the scheduled worker resumes leases when available. Re-enqueueing the same campaign is blocked while it has claimable segments.
- Do not reset `attempt_count` or delete failures to make the dashboard green.
- When all claimable segments are exhausted the current dispatcher unschedules itself; unresolved/quarantined results still require evidence-backed follow-up.

## Rollback
- Stop the worker with `SELECT cron.unschedule('ipbl-current-season-worker');` only during a controlled stop; the daily job may reschedule it.
- Restore `private.ipbl_dispatch_current_ingest` from the pre-migration function snapshot or previous migration, and `public.ipbl_commit_backfill_segment` from `20261122090000_recovery_classification_integrity.sql`. Verify permissions and function fingerprints.
- No canonical records are deleted by the migrations themselves. If a historical data correction must be reversed, restore affected game and period rows from the verified backup with source-observation lineage preserved.
- Do not roll back by deleting evidence, reassigning Men X to Men A, or falsely marking empty segments as verified.

## Acceptance evidence still required
Successful CI and a Vercel READY deployment do not prove archive completeness. Produce a campaign report by division and date with official source IDs, stored matches, mismatches, recovered/updated counts, quarter integrity, unresolved segments, source availability and the earliest independently verified accessible source date. Validate Results/H2H and ongoing daily incremental ingestion in production.
