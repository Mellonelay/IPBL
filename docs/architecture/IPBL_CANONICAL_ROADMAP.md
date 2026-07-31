# IPBL Canonical Recovery Roadmap

**Active stack:** `Mellonelay/IPBL` → Vercel frontend/API → Cloudflare source plane → Supabase canonical history → Graphify/Cloudflare AI later.

## Production boundary

IPBL production is a deterministic application. Agent runtimes are not part of the request path, data path, or operator product. Agents and orchestration assets may be used only for bounded development, recovery, migration, investigation, testing, and maintenance.

## Immediate priorities

1. Restore accurate Results history across all 14 approved divisions.
2. Make direct H2H reliable and prevent source failures from becoming false empty results.
3. Keep Live timely and explicit about source alignment, delay, staleness, and partial coverage.
4. Preserve Graphify, statistics, Cloudflare AI, prediction, betting memory, Replay Lab, and evidence lineage for later phases.

## Canonical ownership

- Official IPBL owns game identity and final status.
- Supabase Postgres stores canonical finished games, periods, teams, aliases, source observations, and backfill coverage.
- The freshest validated source may supply live score, period, and clock.
- Supabase Realtime is notification only; it is never canonical truth.
- Upstash remains a legacy read fallback until export and reconciliation are complete.

## Delivery phases

### Phase 0 — architecture lock

Commit the canonical roadmap, data contract, source-trust policy, migration runbook, and maintenance-only agent boundary before runtime or schema mutation.

### Phase 1 — H2H emergency repair

Read order: Supabase verified history → official IPBL history → legacy Upstash → explicit unavailable state. A source failure must never render as “no verified meetings.”

### Phase 2 — Supabase foundation

Apply versioned migrations for divisions, teams, aliases, games, periods, source observations, live state, source health, backfill tracking, indexes, grants, and read models.

### Phase 3 — all-division backfill

Run bounded division/date segments: last 30 days, current season from each division validity date, earlier exposed official history, then retries and quarantine reconciliation.

### Phase 4 — canonical cutover

Switch Results, H2H, team form, and quarter history to Supabase while retaining official IPBL as the degraded fallback.

### Phase 5 — live-source accuracy

Fetch direct official IPBL, Cloudflare official proxy, Melbet, and the 1xBet mirror in parallel. Enforce monotonic score/period rules, alias quarantine, and last-known-good continuity.

### Phase 6 — focused operator experience

Make Live, H2H, and Results the primary mobile workflow. Keep technical health, Intelligence, Teams, and Betting Record available under secondary navigation without deleting their code or evidence.

### Phase 7 — verified release

GitHub branch → focused tests → Vercel preview → API and responsive QA → merge → production deployment → runtime-log verification.

## Completion gates

- Every division/date segment is classified as verified, confirmed empty, retryable failure, or quarantined.
- Direct H2H is newest-first, period-correct, source-labelled, and unavailable-aware.
- Results and H2H operate with Upstash unavailable.
- Security and performance advisors are reviewed after schema changes.
- Mobile reconnect, stale data, partial data, and out-of-order responses are tested.
- Upstash is retired only after Supabase counts, checksums, and official-source coverage reconcile.
