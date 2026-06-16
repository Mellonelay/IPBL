# Live UI Freshness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the Vercel UI renders fresh `liveGames` score/clock state over stale `liveInsights[*].game` snapshots while preserving insight metadata.

**Architecture:** Keep freshness reconciliation in the pure helper `src/live/display.ts` so React rendering stays deterministic and testable. `src/App.tsx` continues to pass `liveGames`, `liveInsights`, the division filter, and `liveKey`; the helper returns insights keyed by fresh games with `game` replaced by the fresh live game object.

**Tech Stack:** TypeScript, Vite, React `useMemo`, Node assertion tests via `tests/ipbl-source/ts-extension-loader.mjs`.

---

### Task 1: Lock Fresh Game Hydration Behavior

**Files:**
- Modify: `tests/live-display-state.test.ts`
- Verify: `src/live/display.ts`

- [x] **Step 1: Write the failing test**

Add coverage that proves:
- metadata from the stale insight survives;
- stale `insight.game` score/clock fields are replaced by the fresh `liveGames` object;
- selected division filtering still applies before hydration.

```ts
const staleOtherDivisionGame = {
  gameId: 111,
  tag: "ipbl-66-w-pro-a",
  scoreText: "1 : 1",
};

const freshOtherDivisionGame = {
  ...staleOtherDivisionGame,
  scoreText: "10 : 12",
};

const filteredDisplay = buildLiveDisplayInsights<Game, Insight>({
  games: [freshGame, freshOtherDivisionGame],
  insights: {
    "ipbl-66-m-pro-a:729342100": {
      game: oldGame,
      decision: "ALLOW",
    },
    "ipbl-66-w-pro-a:111": {
      game: staleOtherDivisionGame,
      decision: "WATCH",
    },
  },
  selectedDivisionTag: "ipbl-66-m-pro-a",
  keyForGame: (game) => `${game.tag}:${game.gameId}`,
});

assert.equal(filteredDisplay.length, 1);
assert.equal(filteredDisplay[0].decision, "ALLOW");
assert.equal(filteredDisplay[0].game, freshGame);
assert.equal(filteredDisplay[0].game.scoreText, "23 : 18");
```

- [x] **Step 2: Run test to verify it fails if helper is stale**

Run:
```bash
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-display-state.test.ts
```

Expected on stale implementation:
```text
AssertionError: Expected "7 : 2" to strictly equal "23 : 18"
```

If it already passes, preserve the test as a regression guard and continue to Task 2.

- [x] **Step 3: Implement minimal helper behavior**

In `src/live/display.ts`, ensure returned insights use object spread in this order:

```ts
return insight ? { ...insight, game } : null;
```

This preserves `decision` and other insight metadata while replacing `insight.game`.

- [x] **Step 4: Run focused test**

Run:
```bash
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-display-state.test.ts
```

Expected:
```text
Live display state freshness tests passed
```

### Task 2: Verify Frontend Integration Contract

**Files:**
- Verify: `src/App.tsx`
- Verify: `src/live/display.ts`
- Test: `tests/live-display-state.test.ts`

- [x] **Step 1: Confirm React integration uses fresh live inputs**

Verify `displayLiveInsights` is created with:
```ts
buildLiveDisplayInsights({
  games: liveGames,
  insights: liveInsights,
  selectedDivisionTag: selectedLiveDivisionTag,
  keyForGame: liveKey,
});
```

- [x] **Step 2: Run TypeScript/Vite build**

Run:
```bash
npm run build
```

Expected:
```text
✓ built in ...
```

- [x] **Step 3: Inspect cache-sensitive frontend path if build or behavior indicates drift**

Only if tests/build fail or `App.tsx` bypasses `buildLiveDisplayInsights`, inspect fetch behavior around `/api/results/live` and verify no stale memo or cache layer reuses `insight.game`.

### Task 3: Commit Priority 1

**Files:**
- Modify: `src/App.tsx`
- Add: `src/live/display.ts`
- Add/Modify: `tests/live-display-state.test.ts`
- Add: `docs/superpowers/plans/2026-06-16-live-ui-freshness.md`

- [x] **Step 1: Review diff scope**

Run:
```bash
git status --short src/App.tsx src/live/display.ts tests/live-display-state.test.ts docs/superpowers/plans/2026-06-16-live-ui-freshness.md
git diff -- src/App.tsx src/live/display.ts tests/live-display-state.test.ts docs/superpowers/plans/2026-06-16-live-ui-freshness.md
```

Expected: only Priority 1 helper, test, and plan changes are staged candidates.

- [ ] **Step 2: Commit only Priority 1 files**

Run:
```bash
git add src/App.tsx src/live/display.ts tests/live-display-state.test.ts docs/superpowers/plans/2026-06-16-live-ui-freshness.md
git commit -m "fix: hydrate live insights with fresh games"
```

Expected: one commit containing only the scoped Priority 1 files.

**Self-review:** This covers the Priority 1 freshness bug, preserves existing architecture, avoids Layer 4/5 refactors, and does not advance to Priority 2 until tests/build pass and the scoped commit exists.
