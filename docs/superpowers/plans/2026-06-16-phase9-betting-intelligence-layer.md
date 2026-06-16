# Phase 9 Betting Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map bet history entries onto deterministic replay states and compute profit/loss for each bet without changing the live recorder or replay API contracts.

**Architecture:** Reuse the phase-8 replay engine as the authoritative state timeline. Add a small server-side intelligence module that loads or accepts bet rows, resolves each bet to a replay snapshot by `raw_main_game_id` and placement time, and emits a normalized intelligence record with `contextSnapshot`.

**Tech Stack:** TypeScript, existing JSON betting datasets, Vercel serverless utilities, existing replay engine.

---

### Task 1: Add a failing bet-to-state mapping regression

**Files:**
- Create: `tests/betting-intelligence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
assert.equal(entries[0].betId, 79646367087);
assert.equal(entries[0].gameId, 708269472);
assert.equal(entries[0].quarter, "Q1");
assert.equal(entries[0].odds, 1.65);
assert.equal(entries[0].result, "Win");
assert.equal(entries[0].profitLoss, 110500);
assert.equal(entries[0].contextSnapshot.kind, "quarter");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/betting-intelligence.test.ts`
Expected: FAIL because the intelligence module is not implemented.

### Task 2: Implement the mapping helper

**Files:**
- Create: `lib/server/betting-intelligence.ts`

- [ ] **Step 1: Write the minimal implementation**

```ts
export function buildBettingIntelligenceEntries(bets, replays) {
  return bets.map((bet) => ({
    betId: bet.slip_id,
    gameId: bet.raw_main_game_id,
    quarter: bet.quarter,
    odds: bet.odds,
    result: bet.bet_status,
    profitLoss: bet.bet_status === "Win" ? Number(bet.actual_payout) - Number(bet.stake) : -Number(bet.stake),
    contextSnapshot: findReplaySnapshot(replays, bet.raw_main_game_id, bet.placed_at, bet.quarter),
  }));
}
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/betting-intelligence.test.ts`
Expected: PASS.

### Task 3: Verify the existing app and recorder remain stable

**Files:**
- None

- [ ] **Step 1: Run the narrow regression checks**

Run: `npm run test:recorder`
Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.

### Task 4: Commit Phase 9

**Files:**
- Commit only the betting intelligence source and test files.

- [ ] **Step 1: Commit**

```bash
git add lib/server/betting-intelligence.ts tests/betting-intelligence.test.ts docs/superpowers/plans/2026-06-16-phase9-betting-intelligence-layer.md
git commit -m "feat: link betting history to replay state"
```
