# IPBL Supabase Migration Runbook

## Safety boundary

Canonical target: direct Supabase project `Ipbl-data` (`hdrkrtfpcuzsbegytrei`) in Seoul. The Vercel Marketplace duplicate `rxpjpwqqpdrnlvuhchyg` is not a migration target. Upstash remains untouched until reconciliation and cutover gates pass.

Never print database passwords, secret keys, service-role keys, JWT secrets, or full connection strings. Use environment injection and masked validation output.

## Preflight

1. Confirm the Vercel project ID and Supabase project reference.
2. Pull production environment variables into ignored local files.
3. Verify repository branch and clean working tree.
4. Confirm no prior application migrations exist remotely.
5. Rotate any credential exposed in terminal, logs, chat, or CI before continuing.
6. Run a migration dry-run before applying DDL.

## Schema deployment

1. Review the timestamped SQL migration.
2. Run remote dry-run with the session/non-pooling connection.
3. Apply only pending migrations.
4. Compare local and remote migration history.
5. Generate TypeScript database types.
6. Run security and performance advisors or equivalent checks.
7. Verify H2H indexes and bounded read-model queries.

No seed operation is permitted against production.

## Backfill execution

Each segment is one approved division plus one bounded date window. Segment states are:

- `pending`
- `running`
- `verified`
- `confirmed_empty`
- `retryable_failure`
- `quarantined`

Backfill passes:

1. Last 30 days across all 14 divisions.
2. Current season from each division `validFrom` date.
3. Earlier history exposed by official APIs.
4. Retry failed windows and reconcile quarantined records.

Acceptance requires official game ID, canonical teams, supported finished status, valid scores, and period reconciliation when complete. Re-running a segment must create no duplicates.

## Cutover

1. Enable Supabase-first H2H with official and Upstash fallbacks.
2. Compare Supabase versus official IPBL and legacy Upstash counts/checksums.
3. Switch Results reads to Supabase.
4. Verify direct H2H, team form, and quarter history with Upstash unavailable.
5. Keep a rollback flag that restores legacy reads without deleting Supabase data.

## Retirement gate

Upstash may be retired only when:

- every expected division/date segment is classified;
- Supabase game counts and official IDs reconcile;
- period completeness and quarantine totals are documented;
- Results and H2H pass with Upstash credentials disabled;
- production preview and mobile/desktop QA pass;
- rollback evidence is captured.

## Rollback

Schema migrations are forward-only. Application cutover is controlled independently. On a failed deployment:

1. Restore the prior Vercel deployment or disable Supabase-first reads.
2. Keep newly written Supabase evidence for investigation.
3. Do not reset or drop the remote database.
4. Record the failing migration, route, query, and source evidence.
5. Patch through a new migration or application commit.
