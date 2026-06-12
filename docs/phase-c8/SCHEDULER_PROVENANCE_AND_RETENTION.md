# Phase C8 Scheduler Provenance and Retention

## Scheduler provenance

Continuous recording is provided by the VM systemd timer `ipbl-recorder.timer`, not by the daily Vercel cron. It has run every minute since 2026-06-12 06:42:55 UTC. The installed trigger exactly matches the tracked repository script.

The Vercel cron `0 0 * * *` is a daily safety invocation only.

## Verified runtime evidence

- Starts/finishes: 723 / 723
- Failures: 0
- Persisted changed snapshots: 1125
- Deduplicated polls: 27
- Source statuses: `{"FAIL": 109, "OK": 1, "PARTIAL": 613}`

## Retention

Per-game timelines and latest snapshots expire 30 days after their last changed snapshot. Each timeline is capped at 1,440 changed snapshots. At one changed snapshot per minute, the cap represents 24 hours; deduplication extends the wall-clock window.

The `runs`, `status`, and `active` control keys have no TTL. `runs` is capped at 1,440 entries; `status` is one string; `active` is a cleaned set. This is bounded storage, but the no-expiry policy must remain explicit and monitored.
