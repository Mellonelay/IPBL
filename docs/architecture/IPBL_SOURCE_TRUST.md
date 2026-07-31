# IPBL Source Trust Policy

## Source roles

| Source | Primary responsibility |
| --- | --- |
| Direct official IPBL | Game identity, division, teams, scheduled time, official status, final result |
| Cloudflare official proxy | Transport path to official IPBL; never a separate authority |
| Melbet | Fresh live score, period, clock, and bookmaker comparison when validated |
| 1xBet mirror | Secondary bookmaker evidence and divergence detection |
| Supabase | Canonical historical memory and accepted live-state snapshots |
| Upstash | Temporary legacy fallback during migration only |

## Read precedence

Historical team/H2H reads use:

1. Supabase verified canonical history.
2. Official IPBL online and bounded recent calendar history.
3. Legacy Upstash Results history.
4. Explicit unavailable response.

A source failure is not evidence that zero games exist.

## Live reconciliation

- Official IPBL owns game identity and finished status.
- The freshest validated source may supply score, period, and clock.
- Every candidate update is compared by source event time, receive time, and canonicalization time.
- An older update cannot overwrite a newer accepted update.
- A lower score or regressed period requires an explicit correction path.
- Unknown or ambiguous team labels are quarantined.
- The last known good state remains visible during reconnects.

## Operator-facing states

The API and UI distinguish:

- `aligned`: available sources agree within the accepted freshness window.
- `partial`: one or more expected sources are unavailable but canonical evidence remains usable.
- `disagreeing`: current validated sources conflict.
- `delayed`: source is responding but outside the expected update cadence.
- `stale`: last-known-good evidence is retained but too old for normal live use.
- `unavailable`: no trustworthy evidence can currently be loaded.
- `recovered`: a source returned after a delayed, stale, or unavailable state.

These states must appear near the affected evidence with a last-updated time. Technical stack traces remain in logs, not in the betting workflow.

## Polling policy

- Visible active game: 5–8 seconds.
- Background tab: 25–30 seconds.
- No active games: 30–60 seconds.
- Results history: bounded cache and explicit manual refresh; never high-frequency polling.

## Failure behavior

- Keep last-known-good evidence visible when safe.
- Show delayed, stale, partial, offline, and unavailable as distinct states.
- Do not clear a populated H2H or Results view merely because a refresh failed.
- Do not silently convert transport, quota, parsing, or database failures into an empty result set.
- Record source failures with source, division, route, timestamp, and retryability.
