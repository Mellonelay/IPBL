# Live Source Drift Detection

This runbook defines the read-only checks for detecting stale live rows and live-source drift.

## Incident summary

- Stale production live row: gameId `1073505`
- Matchup: Bryansk vs Izhevsk
- Stale score observed in the incident: `81:76`
- The remediation path now drops stale live rows when the official detail is terminal and fresher verified live data is present.

Anchoring verification:
- [tests/live-feed-freshness.test.ts](/root/repos/IPBL/tests/live-feed-freshness.test.ts)
- [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)
- [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)

## Invariant

- Official detail and live feed must agree on the freshest verified matchup state.
- Terminal official detail wins over stale live/bookmaker rows for the same matchup.
- A stale row may remain in source history, but it must not render as current live truth.

## /api/results/live verification procedure

1. Request the live endpoint with a cache-busting query parameter.
2. Confirm read-only headers indicate non-stale behavior.
3. Compare the returned live rows against the expected matchup freshness.
4. Confirm the stale `1073505` row is absent from the current live result set.
5. Re-run the request once to confirm the response is stable and still fresh.

## Browser / UI verification procedure

1. Open the live tab in a read-only browser session.
2. Confirm the visible live card matches the freshest row, not the stale ghost row.
3. Confirm the detail drawer and score display do not regress to the older score.
4. Confirm the UI still respects the selected division filter.
5. If browser tooling is unavailable, use the API verification fallback and record that limitation.

## Cache-busting procedure

- Use `cache: "no-store"` for live fetches.
- Append a timestamp query when probing `/api/results/live`.
- Clear local fetch caches before re-running the live probe.
- Avoid memoized reuse of old `insight.game` state in the UI path.

## Vercel observability procedure

- Use read-only `vercel inspect` when available.
- Use read-only `vercel logs --limit 50` against the deployment URL or deployment ID.
- Match logs to the branch, commit SHA, and deployment URL before drawing conclusions.
- Treat CDN staleness and application staleness as separate failure modes.

## Expected result

- The stale `1073505` row does not appear as the current live row.
- Live data reflects the freshest verified matchup state.
- API and UI checks both remain read-only.

