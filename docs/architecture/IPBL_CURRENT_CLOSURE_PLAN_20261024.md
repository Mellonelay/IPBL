# IPBL — Evidence-based closure plan (2026-10-24)

## Governing scope
Canonical repository: `Mellonelay/IPBL` main. Production: Vercel Hobby (`ipbl-minimal-viewer.vercel.app`). Canonical historical store: Supabase `rxpjpwqqpdrnlvuhchyg`. No Remote Desktop Commander/VM/Cloudflare Worker. Preserve proven work; no broad re-backfill. Source authority is the official IPBL API; bookmakers are supplemental observations.

## Completed foundations (verify against live versions before claiming future completion)
- 14 approved divisions; September 1–October 23, 2026 historical run 742/742 segments, 2,019 canonical games. Pro Men G has zero verified records; do not invent activity.
- Official API recovered, season-boundary and direct H2H fixes, team statistics completed-game filtering, monotonic live reconciliation, betting record and settlement fixes.
- Supabase-first September-onward Results route; legacy fallback retained.
- Five-minute Supabase recorder dispatch (Cron and pg_net, Vault secret), Vercel daily recorder cron removed, health policy updated. HTTP 200, deduplication and replay existence observed. Source health remained DEGRADED because bookmaker errors/partial coverage and historical schedule gaps.

## Remaining work / execution order

### A. Live evidence semantics and source-coverage reliability (P0)
1. Distinguish successful official division API queries from number of divisions with *active games*.
2. An empty successful official response must not count as source failure; bookmaker errors remain visible. Keep known-bad identities quarantined.
3. Regression: 14 successful divisions, 1 active game => 14 successful requests / 1 active division, not 1/14 source coverage. An idle matchday remains IDLE if inputs healthy.
4. Validate production health twice on separate Supabase Cron runs; require heartbeat age within 20 min and no unexpected 401/5xx. Remaining real source failures separately classified.

### B. Recorder timeline and Replay integrity (P0/P1)
1. Check fresh capture on scheduled invocations with distinct source timestamps and verify deduplication when score unchanged.
2. Replay one game with evolving quarter scores; verify monotonic event time and no future information.
3. Inspect Upstash snapshot TTL/keys and recorder list retention; bound growth within available free quotas.
4. Acceptance: two distinct successful scheduled invocations plus a replay timeline preserving chronological evidence. A single HTTP 200 alone does not complete this phase.

### C. Bookmaker identity and odds evidence (P1)
1. Extract failing Melbet/1xBet league identity diagnostics from real server evidence without guessing team aliases.
2. Reconcile actual matched event names against canonical teams and 14 approved division tags.
3. Validate odds freshness and cross-bookmaker differences; source outage must not introduce fabricated prices.
4. Acceptance: deterministic tests with verified fixtures, accessible source coverage metrics, and documented unresolved upstream failures.

### D. Canonical reader acceptance (P1)
1. Cross-check Results monthly counts, date/grain and game IDs for all 14 divisions against Supabase and official source evidence.
2. Validate direct H2H versus team history, season rollover, incomplete quarters and duplicate game IDs in rendered Game Detail and Teams.
3. Acceptance: representative end-to-end browser/mobile journeys and parity receipts. Backfill remains unchanged.

### E. Betting Record and Intelligence (P2)
1. Validate historical-only imported betting slips, payout semantics, pending/void statuses and division-scoped match IDs.
2. Evaluate recorder/replay-based quarter signals with chronological cutoffs and held-out samples; keep `evidence_only` recommendations until calibrated.
3. Acceptance: replay fixture tests and no unsupported predictive-confidence or auto-betting claims.

### F. Mobile UX and final release (P2)
1. Use product-design audit of Live, Results, Game Drawer, Teams, Intelligence and Betting Record at compact viewports.
2. Fix only reproducible navigation/overlay/legibility issues; retain a single React/Vite frontend.
3. GitHub Controlled CI passing for exact commit, Vercel production READY at same SHA, production API smoke, Supabase Cron/health runtime evidence.
4. Update legacy Cloudflare-era architecture documents and remove unused dependencies only after verifying no runtime consumers.

## Execution rules
One parent controller; focused skills only. Write a failing regression before behavior changes when feasible; independent GitHub branch/PR, passing CI and READY preview before merge. Treat CI, preview, prod and runtime evidence as separate proofs. Every incomplete phase retains an explicit gap and next concrete verification rather than a false all-done claim.
