# Phase 7 Odds Movement Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist deterministic quarter-linked over/under odds snapshots and expose them through the existing recorder pipeline without changing live results behavior.

**Architecture:** Reuse the recorder as the persistence boundary. Add a minimal odds snapshot extractor and store odds events alongside the phase-6 quarter timeline using the same game-keyed Redis structures, so replay can join quarter state and odds state later without introducing a new storage subsystem.

**Tech Stack:** TypeScript, Vercel functions, Upstash Redis, existing IPBL recorder tests.

---

### Task 1: Add a failing odds persistence regression

**Files:**
- Modify: `tests/live-recorder.test.ts`
- Create: `tests/odds-movement.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
assert.equal(oddsSnapshot.quarter, 3);
assert.equal(oddsSnapshot.marketType, "over_under");
assert.equal(oddsSnapshot.line, 164.5);
assert.equal(oddsSnapshot.overOdds, 1.91);
assert.equal(oddsSnapshot.underOdds, 1.87);
assert.equal(oddsSnapshot.bookmaker, "melbet");
assert.equal(oddsSnapshot.marketStatus, "open");
assert.equal(oddsSnapshot.capturedAt, "1970-01-01T00:00:03.000Z");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/odds-movement.test.ts`
Expected: FAIL because odds snapshots are not yet emitted.

### Task 2: Add minimal odds snapshot extraction and persistence

**Files:**
- Modify: `lib/server/live-recorder.ts`

- [ ] **Step 1: Write the minimal implementation**

```ts
export type OddsMovementSnapshot = {
  gameId: number;
  quarter: number | null;
  marketType: string;
  line: number | null;
  overOdds: number | null;
  underOdds: number | null;
  bookmaker: string;
  marketStatus: string;
  capturedAt: string;
};
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/odds-movement.test.ts`
Expected: PASS.

### Task 3: Confirm recorder and live API remain stable

**Files:**
- Modify: `api/recorder.ts` if retrieval needs odds exposure

- [ ] **Step 1: Run the narrow recorder tests**

Run: `npm run test:recorder`
Expected: PASS.

- [ ] **Step 2: Run the live API smoke check**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-feed-freshness.test.ts`
Expected: PASS.

### Task 4: Commit Phase 7

**Files:**
- Commit only the Phase 7 source/test files.

- [ ] **Step 1: Commit**

```bash
git add lib/server/live-recorder.ts tests/live-recorder.test.ts tests/odds-movement.test.ts docs/superpowers/plans/2026-06-16-phase7-odds-movement-engine.md
git commit -m "feat: persist odds movement snapshots"
```
