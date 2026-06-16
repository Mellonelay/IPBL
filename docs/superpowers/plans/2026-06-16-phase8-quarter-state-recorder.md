# Phase 8 Quarter-State Recorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing live recorder quarter/timeRemaining data into a deterministic quarter-state scaffold that can be consumed by future open phases without mutating the approved division registry or any locked API contract.

**Architecture:** Keep the new phase as a pure server-side adapter over the live recorder snapshots. The module should normalize one stable quarter-state object shape from either a pre-shaped input or an existing `RecordedLiveSnapshot`, then expose that as the basis for future quarter replay and reasoning layers. No new routes, no registry mutation, and no frontend coupling.

**Tech Stack:** TypeScript, existing live recorder types, Node.js tests, Vite build.

---

### Task 1: Keep the quarter-state contract deterministic

**Files:**
- Modify: `lib/server/quarter-state-recorder.ts`
- Modify: `tests/quarter-state-recorder.test.ts`

- [x] **Step 1: Write the failing test**

```ts
assert.deepEqual(buildQuarterStateSnapshot(input), {
  gameId: 1073715,
  division: "Pro Men B",
  teams: ["Nizhny Novgorod", "Tolyatti"],
  quarter: 3,
  timeRemaining: "07:40",
  score: "35 : 31",
  source: "bookmaker:melbet.com",
});
```

- [x] **Step 2: Implement the minimal normalizer**

```ts
export function buildQuarterStateSnapshot(input: QuarterStateInput | RecordedLiveSnapshot): QuarterStateSnapshot
```

- [x] **Step 3: Verify the narrow test passes**

Run: `npm run test:quarter-state-recorder`
Expected: PASS.

### Task 2: Preserve invariants

**Files:**
- Modify: `tests/quarter-state-recorder.test.ts`

- [x] **Step 1: Verify invalid input fails fast**

```ts
assert.throws(() => buildQuarterStateSnapshot({ ...input, gameId: 0 }), /gameId/);
assert.throws(() => buildQuarterStateSnapshot({ ...input, quarter: null }), /quarter/);
```

- [x] **Step 2: Verify live snapshots normalize to the same shape**

```ts
assert.deepEqual(buildQuarterStateSnapshot(liveSnapshot), {
  gameId: 1073715,
  division: "Pro Men B",
  teams: ["Nizhny Novgorod", "Tolyatti"],
  quarter: 3,
  timeRemaining: "07:40",
  score: "35 : 31",
  source: "bookmaker:melbet.com",
});
```

### Task 3: Validation and handoff

**Files:**
- Modify: `package.json`

- [x] **Step 1: Add a direct phase test entrypoint**

```json
"test:quarter-state-recorder": "node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/quarter-state-recorder.test.ts"
```

- [ ] **Step 2: Re-run build and validation from a baseline that already contains the locked support files**

Run:
```bash
npm run build
npx agnix@0.32.0 .
```

Expected:
- Build passes
- Agnix returns `0 errors`

## Self-Review

- No placeholders remain.
- The quarter-state recorder stays read-only.
- The current worktree still needs the locked support baseline synced in before a final merge gate can be claimed.
