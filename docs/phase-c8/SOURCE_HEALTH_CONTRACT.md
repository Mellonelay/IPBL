# Phase C8 Source Health Contract

`GET /api/recorder/health` evaluates the persisted recorder status and the newest 30 run records.

- **HEALTHY**: fresh heartbeat, no fallback/degradation indicators, no scheduler gap.
- **DEGRADED**: fallback active, PARTIAL source, incomplete division coverage, upstream/bookmaker failures, unmatched events, or a scheduler gap.
- **STALE**: heartbeat older than 150 seconds but no older than 300 seconds.
- **FAILED**: source reports FAIL or heartbeat is older than 300 seconds.
- **UNKNOWN**: no valid persisted recorder status.

The contract exposes source coverage, fallback state, failure counts, unmatched-event count, latency, recent scheduler gaps and the explicit retention policy. It does not expose credentials or raw environment values.
