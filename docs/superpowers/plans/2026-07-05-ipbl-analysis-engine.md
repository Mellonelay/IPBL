# IPBL Analysis Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only backend analysis engine that formalizes where Graphify community skills fit in IPBL and exposes the backend analysis boundary as a canonical repository artifact.

**Architecture:** Keep live ingestion, C9 reconciliation, and UI rendering unchanged. Add a repository-derived analysis report plus supporting docs that explain how `graphify-intent`, `graphify-temporal`, and `code-review-graph` belong behind the IPBL backend analysis layer, not inside the live recorder or bookmaker fetchers.

**Tech Stack:** TypeScript, JSON artifacts, existing repo test runner (`node --loader ./tests/ipbl-source/ts-extension-loader.mjs`), markdown docs.

## Global Constraints

- The analysis engine must be read-only and repository-derived.
- Do not change live ingestion, recorder behavior, or bookmaker fetch logic.
- Keep the canonical phase / ledger style already used by the repo.
- The Graphify community skills to surface are `graphify-intent`, `graphify-temporal`, and `code-review-graph`.
- Use exact file paths and keep the new surface aligned with the current artifact pattern.

---

### Task 1: Materialize the backend analysis engine artifact

**Files:**
- Create: `lib/server/analysis-engine.ts`
- Create: `artifacts/analysis-engine/ipbl-analysis-engine.json`
- Create: `tests/analysis-engine.test.ts`

**Interfaces:**
- Consumes: repository docs and artifact paths from the existing Graphify / C9 / operator-intelligence surfaces.
- Produces: `buildAnalysisEngineFromRepository()` plus a canonical read-only `ipbl.analysis-engine.v1` artifact.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ANALYSIS_ENGINE_ARTIFACT_PATH, buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.ts";

const artifact = JSON.parse(fs.readFileSync(ANALYSIS_ENGINE_ARTIFACT_PATH, "utf8")) as Record<string, unknown>;
const report = buildAnalysisEngineFromRepository();

assert.equal(report.schema, "ipbl.analysis-engine.v1");
assert.equal(report.status, "materialized");
assert.equal(report.readOnly, true);
assert.deepEqual(report.skills.map((skill) => skill.name), [
  "graphify-intent",
  "graphify-temporal",
  "code-review-graph",
]);
assert.ok(report.inputs.graphify.graphReport.endsWith(path.join("graphify-out", "GRAPH_REPORT.md")));
assert.deepEqual(report, artifact);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/analysis-engine.test.ts`
Expected: FAIL because the module and artifact do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/server/analysis-engine.ts
// Return a static, repository-derived read-only report that explains how the
// backend analysis layer should use Graphify community skills.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/analysis-engine.test.ts`
Expected: PASS and the artifact equals the builder output.

- [ ] **Step 5: Commit**

```bash
git add lib/server/analysis-engine.ts artifacts/analysis-engine/ipbl-analysis-engine.json tests/analysis-engine.test.ts
git commit -m "feat: materialize IPBL analysis engine artifact"
```

### Task 2: Publish the analysis-engine placement in repo docs and ledgers

**Files:**
- Modify: `docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md`
- Modify: `docs/PHASE_MASTER_INDEX.md`
- Modify: `docs/PHASE_MASTER_CHECKLIST.md`
- Modify: `docs/PHASE_FINAL_MASTER_LEDGER.md`
- Modify: `docs/PHASE_CLOSURE_CURRENT_STATE.md`
- Modify: `artifacts/graphify/phase-roadmap.json`
- Modify: `artifacts/graphify/god-node-ledger.json`
- Modify: `package.json`
- Create: `tests/analysis-engine-docs.test.ts`

**Interfaces:**
- Consumes: the new analysis-engine artifact and the existing Graphify phase / god-node ledgers.
- Produces: one new repository-backed phase/layer entry and one test script for the new contract.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import fs from "node:fs";

const roadmap = fs.readFileSync("docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md", "utf8");
const index = fs.readFileSync("docs/PHASE_MASTER_INDEX.md", "utf8");
const checklist = fs.readFileSync("docs/PHASE_MASTER_CHECKLIST.md", "utf8");
const ledger = fs.readFileSync("docs/PHASE_FINAL_MASTER_LEDGER.md", "utf8");
const closure = fs.readFileSync("docs/PHASE_CLOSURE_CURRENT_STATE.md", "utf8");
const phaseRoadmap = fs.readFileSync("artifacts/graphify/phase-roadmap.json", "utf8");
const godLedger = fs.readFileSync("artifacts/graphify/god-node-ledger.json", "utf8");

for (const text of [roadmap, index, checklist, ledger, closure, phaseRoadmap, godLedger]) {
  assert.match(text, /artifacts\/analysis-engine\/ipbl-analysis-engine\.json/);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/analysis-engine-docs.test.ts`
Expected: FAIL until the script and docs references exist.

- [ ] **Step 3: Write minimal implementation**

Update the roadmap and ledgers with the new analysis layer, and add `test:analysis-engine` to `package.json`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:analysis-engine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md docs/PHASE_MASTER_INDEX.md docs/PHASE_MASTER_CHECKLIST.md docs/PHASE_FINAL_MASTER_LEDGER.md docs/PHASE_CLOSURE_CURRENT_STATE.md artifacts/graphify/phase-roadmap.json artifacts/graphify/god-node-ledger.json package.json tests/analysis-engine-docs.test.ts
git commit -m "docs: place graphify analysis engine in repo ledgers"
```

## Self-Review

- Spec coverage: the backend analysis boundary is explicit, read-only, and mapped to the three requested community skills.
- Placeholder scan: no TBD / TODO text in the task steps that matter.
- Type consistency: the artifact path, schema name, and builder name are consistent across tasks.
