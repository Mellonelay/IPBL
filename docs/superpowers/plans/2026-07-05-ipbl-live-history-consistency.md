# IPBL Live History Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the IPBL app consistent across live, results, and team-history surfaces by canonicalizing 14 divisions, backfilling official history from June 1, 2026 through today, preserving newest-first H2H/team history, and adding per-card live source badges.

**Architecture:** The work splits into four independent slices: registry/contracts, official daily backfill, history/H2H consumer ordering, and live source badge presentation. Results history stays Results-KV-backed, live freshness stays on the existing merge path, and the UI badge only reflects provenance from the winning live row. Validation is split so each slice can be proven with focused unit tests plus the existing browser verification script.

**Tech Stack:** TypeScript, Vercel API routes, Results KV, existing IPBL parsers/normalizers, React, CSS, Playwright, Node test runners.

## Global Constraints

- Canonical division registry contains 14 divisions: `Pro Men A`, `Pro Men B`, `Pro Men C`, `Pro Men D`, `Pro Men G`, `Pro Men U`, `Pro Men Z`, `Pro Men L`, `Pro Women A`, `Pro Women B`, `Pro Women C`, `Pro Women D`, `Pro Women G`, and `Pro Women K`.
- `Pro Men G` is visible in the approved registry; it is not treated as an invisible historical-only exception.
- Historical results backfill starts at `2026-06-01` and runs through the current date.
- Historical coverage must be derived from the official IPBL schedule/calendar source, one day at a time, not by trusting broad-range aggregation alone.
- H2H and Team Statistics must sort histories newest-first by scheduled time, then game id.
- Live source presentation stays separate from results history repair.
- No betting prediction, c9, agnix, or unrelated roadmap work belongs in this change.

---

### Task 1: Canonical 14-division registry and query contracts

**Files:**
- Modify: `src/config/divisions.ts`
- Modify: `lib/server/results-sync-constants.ts`
- Modify: `tests/team-registry.test.ts`
- Modify: `tests/results-sync-policy.test.ts`
- Modify: `tests/frontend-api-query-contracts.test.mjs`

**Interfaces:**
- Consumes: `LIVE_DIVISION_TAGS`, `DIVISIONS`, `LIVE_DIVISIONS`, `RESULTS_SYNC_TAGS`, `resultsSyncTagsForMonth()`, `TEAM_STATISTICS_DIVISIONS`
- Produces: one canonical 14-tag registry used by live, results, and team selectors

- [ ] **Step 1: Write the failing tests**

Add assertions that make the old 13-tag state fail and lock in the 14-tag boundary:

```ts
assert.equal(TEAM_STATISTICS_DIVISIONS.length, 14);
assert.deepEqual(TEAM_STATISTICS_DIVISIONS.map((division) => division.tag), [
  "ipbl-66-m-pro-a",
  "ipbl-66-m-pro-b",
  "ipbl-66-m-pro-c",
  "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g",
  "ipbl-66-m-pro-u",
  "ipbl-66-m-pro-z",
  "ipbl-66-m-pro-l",
  "ipbl-66-w-pro-a",
  "ipbl-66-w-pro-b",
  "ipbl-66-w-pro-c",
  "ipbl-66-w-pro-d",
  "ipbl-66-w-pro-g",
  "ipbl-66-w-pro-k",
]);
assert.equal(resultsSyncTagsForMonth(2026, 6).length, 14);
assert.equal(resultsSyncTagsForMonth(2026, 6).includes("ipbl-66-m-pro-g"), true);
```

- [ ] **Step 2: Run the tests to confirm the current repo fails**

Run:

```bash
npm run test:approved-divisions
npm run test:teams
npm run test:results-hardening
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/frontend-api-query-contracts.test.mjs
```

Expected: failures on the 13-tag contract and on the June results-sync expectations.

- [ ] **Step 3: Implement the registry change**

Update the live/results registry so `Pro Men G` is included everywhere the approved visible list is used. Keep the division labels centralized and let `TEAM_STATISTICS_DIVISIONS` continue to derive from the live registry so the UI automatically inherits the same 14 entries.

- [ ] **Step 4: Update the contract tests**

Make the assertions pass and keep the June/current-month query behavior aligned with the canonical 14-tag registry.

- [ ] **Step 5: Re-run the focused tests**

Run:

```bash
npm run test:approved-divisions
npm run test:teams
npm run test:results-hardening
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/frontend-api-query-contracts.test.mjs
```

Expected: pass.

- [ ] **Step 6: Commit**

Use a single commit that only captures the registry contract changes.

---

### Task 2: Official daily history backfill from June 1 through today

**Files:**
- Add: `lib/server/results-official-backfill.ts`
- Modify: `api/admin/backfill-results.ts`
- Modify: `scripts/backfill-results.mjs`
- Modify: `scripts/fetch-results-calendar.ts`
- Modify: `lib/server/write-results-month-kv.ts`
- Modify: `lib/server/results-hardening.ts`
- Add: `tests/results-official-backfill.test.ts`

**Interfaces:**
- Consumes: official IPBL schedule/calendar rows for a single day, canonical 14-tag registry, Results KV write helpers, existing month metadata shape
- Produces: day-by-day backfill ingestion that rolls up into monthly Results KV buckets and records verified-through dates

- [ ] **Step 1: Write the failing tests**

Add a unit test that proves the backfill logic walks one day at a time from `2026-06-01` to a supplied end date and deduplicates by official game id before writing monthly buckets.

Suggested assertions:

```ts
assert.deepEqual(buildBackfillDays("2026-06-01", "2026-06-03"), [
  "2026-06-01",
  "2026-06-02",
  "2026-06-03",
]);
assert.equal(backfillSummary.verifiedThroughDate, "2026-06-03");
assert.equal(backfillSummary.daysFetched, 3);
assert.equal(backfillSummary.divisionCount, 14);
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run:

```bash
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/results-official-backfill.test.ts
```

Expected: the helper does not exist yet or the June-forward daily sweep is not implemented.

- [ ] **Step 3: Implement the daily backfill helper**

Add a small helper module that:

1. generates an inclusive day list from `2026-06-01` to `today`;
2. fetches the official calendar source for each approved division on each day;
3. deduplicates rows by official game id;
4. groups the rows back into the existing monthly Results KV map;
5. writes metadata that preserves `checkedAt`, `updatedAt`, `verifiedThroughDate`, and the row counters already used by Results KV.

Keep the old month writer intact for month-based jobs, but route the new June-forward sweep through the new helper.

- [ ] **Step 4: Wire the admin route and CLI to the new helper**

Let `api/admin/backfill-results.ts` continue to handle auth and KV writes, but add the new date-range mode so `scripts/backfill-results.mjs` can invoke:

```bash
node scripts/backfill-results.mjs --from 2026-06-01 --to 2026-07-05 --all
```

The script should default `--from` to `2026-06-01` and `--to` to the current date when omitted.

- [ ] **Step 5: Re-run the backfill test**

Run:

```bash
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/results-official-backfill.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

Use a single commit that captures the new official daily backfill path and metadata updates.

---

### Task 3: History consumer ordering and H2H continuity

**Files:**
- Modify: `api/teams/history.ts`
- Modify: `lib/server/team-history-from-results.ts`
- Modify: `scripts/verify-h2h-drawer.mjs`
- Modify: `tests/team-history-results.test.ts`
- Modify: `tests/h2h-order.test.ts`
- Modify: `tests/team-history-official-live.test.ts`
- Modify: `tests/team-history-official-recent-calendar.test.ts`

**Interfaces:**
- Consumes: Results KV months, current official online rows, recent official calendar windows
- Produces: newest-first team history and a deterministic H2H drawer verification path that uses the June reference date

- [ ] **Step 1: Write the failing tests**

Add a focused history test that proves:

```ts
assert.deepEqual(rows.map((row) => row.game.id), [3, 2, 1]);
assert.equal(rows.length, 3);
assert.equal(rows[0].game.localTime > rows[1].game.localTime, true);
```

Add a browser-script expectation that defaults the H2H smoke test to the June reference case:

```bash
H2H_RESULTS_DATE=2026-06-02
H2H_RESULTS_DIVISION=ipbl-66-w-pro-d
```

- [ ] **Step 2: Run the focused tests to confirm the current behavior**

Run:

```bash
npm run test:h2h-order
npm run test:h2h-freshness
npm run test:h2h-continuity
npm run verify:h2h
```

Expected: at least one of the history-order / drawer proof cases should fail until the June-forward backfill is in place.

- [ ] **Step 3: Tighten history ordering and overlay rules**

Make sure `teamHistoryItemsFromMonths()` and `mergeTeamHistoryItems()` continue to dedupe by game id but always return the newest verified row first, with scheduled time as the primary sort key and game id as the tie-breaker.

Keep official overlay rows accepted only when they match the requested approved division/team pair and include a real score.

- [ ] **Step 4: Update the H2H browser verification default**

Set the smoke test default to the June 2 reference example so the drawer proof exercises the exact gap the user called out. Keep the fallback path intact for a live card if present.

- [ ] **Step 5: Re-run the history and browser checks**

Run:

```bash
npm run test:h2h-order
npm run test:h2h-freshness
npm run test:h2h-continuity
npm run verify:h2h
```

Expected: pass.

- [ ] **Step 6: Commit**

Use a commit that only captures history ordering and verification changes.

---

### Task 4: Live source badge and theme-aligned card treatment

**Files:**
- Modify: `src/api/types.ts`
- Modify: `lib/server/live-feed.ts`
- Modify: `lib/server/bookmaker-live.ts`
- Modify: `src/app/LiveTab.tsx`
- Modify: `src/index.css`
- Modify: `tests/live-feed-freshness.test.ts`
- Modify: `tests/live-source-status.test.ts`

**Interfaces:**
- Consumes: the live freshness merge winner, live source provenance, existing live card layout, existing source-failure summaries
- Produces: a per-card badge that shows `IPBL`, `Melbet`, or `1xBet` and survives merge/reconciliation

- [ ] **Step 1: Write the failing tests**

Add a test that proves the live freshness winner keeps source provenance:

```ts
assert.equal(merged[0].sourceKind, "1xbet");
assert.equal(merged[0].sourceLabel, "1xBet");
```

Add a UI-oriented assertion that the live card renders a source badge:

```ts
const badge = screen.getByTestId("live-source-badge");
assert.equal(badge.textContent, "1xBet");
```

- [ ] **Step 2: Run the current live tests and confirm the new expectation fails**

Run:

```bash
npm run test:bookmaker-live
npm run test:live-reconciliation
npm run test:h2h-freshness
```

Expected: the provenance assertion fails until the live model carries a source label.

- [ ] **Step 3: Add a source provenance field to the live model**

Extend the live row shape with a small, explicit provenance field rather than overloading status:

```ts
sourceKind?: "official" | "melbet" | "1xbet" | "recorded";
sourceLabel?: "IPBL" | "Melbet" | "1xBet" | "Recorded" | "Source";
```

Set the field at the live-source boundary so the freshness merge keeps the winning source intact.

- [ ] **Step 4: Render the badge and theme it**

In `src/app/LiveTab.tsx`, render a compact badge in the card header and style it in `src/index.css` so it matches the existing card palette. Keep the badge readable in both Men and Women sections and avoid a flat white treatment that ignores the current theme.

- [ ] **Step 5: Re-run the live tests**

Run:

```bash
npm run test:bookmaker-live
npm run test:live-reconciliation
npm run test:h2h-freshness
```

Expected: pass.

- [ ] **Step 6: Commit**

Use a commit that only captures live source provenance and the badge UI.

---

### Task 5: Validation harness and final browser proof

**Files:**
- Modify: `scripts/validate-phase-master.sh`
- Modify: `scripts/verify-h2h-drawer.mjs`
- Add: `scripts/verify-live-source-badges.mjs`

**Interfaces:**
- Consumes: the task-specific test commands from Tasks 1-4, browser smoke tests, and the repo validation gate
- Produces: a single local validation surface that proves the branch is safe enough to review

- [ ] **Step 1: Write the failing validation expectations**

Make the validation script assert the exact high-value checks for this change:

```bash
npm run test:approved-divisions
npm run test:teams
npm run test:results-hardening
npm run test:h2h-order
npm run test:h2h-freshness
npm run test:h2h-continuity
npm run test:bookmaker-live
npm run test:live-reconciliation
npm run verify:h2h
```

Add a tiny live-card browser smoke script that checks the presence of a source badge on the first rendered live card.

- [ ] **Step 2: Run the validation commands and confirm the current baseline**

Run the local validation matrix once before finishing the branch:

```bash
bash scripts/validate-phase-master.sh
npm run verify:h2h
```

Expected: any missing slice shows up immediately instead of being hidden behind a broad "looks fine" claim.

- [ ] **Step 3: Implement the harness wiring**

Wire the validation script to the new task-level checks so a reviewer can prove:

1. the division registry is 14-wide;
2. the June-forward backfill exists;
3. the H2H drawer resolves on the June 2 reference case;
4. live cards show source provenance.

- [ ] **Step 4: Re-run the validation matrix**

Run:

```bash
bash scripts/validate-phase-master.sh
npm run verify:h2h
node scripts/verify-live-source-badges.mjs
```

Expected: pass.

- [ ] **Step 5: Commit**

Use a final commit that captures the validation harness and browser proof updates.
