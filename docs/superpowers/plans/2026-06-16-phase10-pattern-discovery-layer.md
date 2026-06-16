# Phase 10 Pattern Discovery Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic pattern discovery layer that derives explainable betting patterns from the real historical betting dataset and memory index.

**Architecture:** Add one focused server module that reads normalized betting history rows and emits a small, reproducible set of pattern objects. The module will derive patterns from stable aggregates only: quarter profitability, odds-band performance, and repeated matchup behavior from the memory index. A single regression test will load the real JSON datasets and verify that at least one valid pattern is produced with deterministic identifiers and explainable supporting games.

**Tech Stack:** TypeScript, Node.js test runner via the existing `ts-extension-loader`, repository JSON fixtures in `public/`, existing server-side data shape conventions.

---

### Task 1: Add a deterministic pattern discovery regression test

**Files:**
- Create: `tests/pattern-discovery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import fs from "node:fs";
import { discoverPatterns } from "../lib/server/pattern-discovery.ts";

const bets = JSON.parse(fs.readFileSync("public/bet_history_clean.json", "utf8"));
const memoryIndex = JSON.parse(fs.readFileSync("public/betting_memory_index.json", "utf8"));

const patterns = discoverPatterns(bets, memoryIndex);

assert.ok(patterns.length >= 1);
assert.deepEqual(patterns.map((pattern) => pattern.patternId), [
  "quarter-Q4-positive",
  "odds-1.60-1.79-positive",
  "matchup-repeat-positive",
]);
assert.equal(patterns[0].description, "Q4 bets are the strongest quarter by net profit.");
assert.ok(patterns[0].confidence > 0 && patterns[0].confidence <= 1);
assert.ok(patterns[0].supportingGames.length > 0);
assert.match(patterns[0].ruleSignature, /^quarter:Q4:/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/pattern-discovery.test.ts`
Expected: FAIL with `Cannot find module '../lib/server/pattern-discovery.ts'` or a missing export error.

- [ ] **Step 3: Keep the test scope stable**

Do not mock the JSON fixtures. The test must read the real `public/bet_history_clean.json` and `public/betting_memory_index.json` files so the discovered output stays tied to the actual Phase 10 dataset.

### Task 2: Implement deterministic pattern discovery

**Files:**
- Create: `lib/server/pattern-discovery.ts`

- [ ] **Step 1: Write the minimal implementation**

```ts
export type PatternDiscoveryResult = {
  patternId: string;
  description: string;
  confidence: number;
  supportingGames: number[];
  ruleSignature: string;
};

export function discoverPatterns(bets: Array<Record<string, unknown>>, memoryIndex: Record<string, unknown>): PatternDiscoveryResult[] {
  // derive quarter, odds-band, and matchup patterns from the real data
}
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/pattern-discovery.test.ts`
Expected: PASS with three deterministic patterns in the exact order asserted by the test.

- [ ] **Step 3: Keep the output explainable**

Each pattern object must use stable supporting game ids from the source dataset and a deterministic `ruleSignature` built only from observed aggregates, not from random selection or any inferred/hallucinated fields.

### Task 3: Verify the phase and commit only if green

**Files:**
- Modify: `lib/server/pattern-discovery.ts`
- Modify: `tests/pattern-discovery.test.ts`

- [ ] **Step 1: Run the focused verification command**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/pattern-discovery.test.ts`
Expected: PASS

- [ ] **Step 2: Run the required completion gate**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit the Phase 10 files**

```bash
git add lib/server/pattern-discovery.ts tests/pattern-discovery.test.ts docs/superpowers/plans/2026-06-16-phase10-pattern-discovery-layer.md
git commit -m "feat: add deterministic pattern discovery layer"
```

### Self-Review Checklist

- Phase 10 scope is covered by one focused module and one regression test.
- The test uses the real historical JSON fixtures, not synthetic mocks.
- The output shape matches the required model: `patternId`, `description`, `confidence`, `supportingGames`, `ruleSignature`.
- The plan avoids unrelated refactors, architecture changes, and new API surfaces.
