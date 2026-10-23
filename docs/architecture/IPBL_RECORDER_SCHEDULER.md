# IPBL recorder scheduler (2026-10-24)

Current authority: Supabase project `rxpjpwqqpdrnlvuhchyg`, job `ipbl-live-recorder-5m` (`*/5 * * * *`). Supabase `pg_cron` invokes a restricted SQL dispatcher, which uses `pg_net` to POST to `https://ipbl-minimal-viewer.vercel.app/api/cron/record-live`. Authorization uses a Vault-managed existing recorder credential. Never put credentials in source files, client code, or logs.

The Vercel Hobby application has no recorder Cron. The old daily Vercel recorder schedule was incompatible with the 60-second recorder health expectation. Recorder health now expects a five-minute cadence, with delayed/stale/failed heartbeat boundaries of 600/900/1200 seconds. Foreground Live polling is separate.

Verification at installation:
- GitHub PR #91 passed Controlled CI; deployed commit `74a0d440ab0cd02eff1b816ecfb735e7154b6fd9`.
- Supabase cron job ID 4 was active and its scheduled run succeeded.
- Authenticated HTTP request returned 200 and refreshed the recorder heartbeat.
- Game snapshots were deduplicated; Replay returned a timeline for an existing recorded game.
- Source health can remain DEGRADED if bookmaker coverage is partial or historical scheduler gaps remain. Do not mask source problems by extending health thresholds further.

Operations: inspect `cron.job`, `cron.job_run_details`, and `net._http_response` for dispatch evidence; use the protected recorder health endpoint for freshness, source coverage, and snapshot evidence. The independent job `ipbl-daily-incremental` remains responsible for final Results ingestion.

Rollback: disable the named Supabase recorder job and redeploy the last verified Vercel build if needed. Do not re-enable daily recording as if it were a real-time scheduler. Keep source observations and game history intact.

Free-tier guardrails: 288 invocations/day, roughly 8,640 per 30-day month, plus Vercel Function executions and Redis storage. Reevaluate cadence only after measuring actual usage and recorder coverage.
