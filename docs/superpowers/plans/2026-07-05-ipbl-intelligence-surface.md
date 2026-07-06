# IPBL Intelligence Surface Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the betting UI into a compact live decision surface and a dedicated intelligence path that exposes Graphify, Worker AI, recorder, history, and phase coverage without dumping backend detail into the live drawer.

**Architecture:** Keep `Live`, `Results`, `Teams`, and `Betting Record` as operator surfaces, but move synthesis into a new `Intelligence` tab. Add read-only summary routes for the analysis engine and operator intelligence, then wire a front-end intelligence loader that combines Graphify synthesis, runtime prediction, recorder health, and phase coverage into one view. Trim the live drawer so it only shows decision-critical information and a link into the new intelligence surface.

**Tech Stack:** React 19, Vite, TypeScript, Vercel API routes, existing Graphify Worker, existing IPBL recorder/history modules, Node test runner, CSS in `src/index.css`.

## Global Constraints

- The canonical 14 approved live divisions remain unchanged.
- Live recorder and history contracts remain intact.
- Workers AI is used only for the Graphify intelligence layer and prediction synthesis.
- Graphify community skill integration is limited to `graphify-intent` and `graphify-temporal` for the live intelligence path.
- `agnix` validates agent, skill, and config wiring only.
- All intelligence outputs remain read-only artifacts or runtime responses derived from repository and live evidence.

---

### Task 1: Add read-only summary routes for analysis-engine and operator-intelligence

**Files:**
- Create: `api/analysis-engine.ts`
- Create: `api/operator-intelligence.ts`
- Modify: `package.json`
- Test: `tests/analysis-engine-route.test.ts`
- Test: `tests/operator-intelligence-route.test.ts`

**Interfaces:**
- Consumes: `buildAnalysisEngineFromRepository()` from `lib/server/analysis-engine.ts`; `buildOperatorIntelligenceReport()` from `lib/server/operator-intelligence.ts`
- Produces: `GET /api/analysis-engine` and `GET /api/operator-intelligence` JSON responses that mirror the repo-backed read-only reports

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import handler from "../api/analysis-engine.ts";

const response = await handler({ method: "GET" } as never, {
  status(code: number) { this.statusCode = code; return this; },
  json(body: unknown) { this.body = body; return this; },
} as never);

assert.equal(response.statusCode, 200);
assert.equal(response.body.schema, "ipbl.analysis-engine.v1");
assert.equal(response.body.readOnly, true);
```

- [ ] **Step 2: Run the tests and confirm they fail before the route exists**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/analysis-engine-route.test.ts && node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/operator-intelligence-route.test.ts`
Expected: fail with missing route/module until the new handlers are added.

- [ ] **Step 3: Add the route handlers**

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildAnalysisEngineFromRepository } from "../lib/server/analysis-engine.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json(buildAnalysisEngineFromRepository());
}
```

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildOperatorIntelligenceReport } from "../lib/server/operator-intelligence.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json(buildOperatorIntelligenceReport());
}
```

- [ ] **Step 4: Add route tests to the existing verification scripts**

Add the new route tests to the existing `test:analysis-engine` and `test:operator-intelligence` script chains in `package.json` so the routes are always checked with the existing report tests.

- [ ] **Step 5: Run the route and report tests**

Run:
`npm run test:analysis-engine`

Run:
`npm run test:operator-intelligence`

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit**

```bash
git add api/analysis-engine.ts api/operator-intelligence.ts package.json tests/analysis-engine-route.test.ts tests/operator-intelligence-route.test.ts
git commit -m "feat: expose read-only intelligence summary routes"
```

### Task 2: Build the intelligence surface loader and tab

**Files:**
- Create: `src/app/intelligence-client.ts`
- Create: `src/app/IntelligenceTab.tsx`
- Modify: `src/App.tsx`
- Modify: `src/app/app-types.ts`
- Test: `tests/intelligence-client.test.ts`

**Interfaces:**
- Consumes: `/api/gen-analysis`, `/api/predictions/live`, `/api/recorder?mode=health`, `/api/analysis-engine`, `/api/operator-intelligence`
- Produces: a dedicated `Intelligence` tab with summary cards for Graphify synthesis, prediction runtime, recorder health, and phase coverage

- [ ] **Step 1: Write the failing client test**

```ts
import assert from "node:assert/strict";
import { loadIntelligenceSurface } from "../src/app/intelligence-client.ts";

const snapshot = await loadIntelligenceSurface(async (url) => {
  if (url.endsWith("/api/gen-analysis")) return new Response(JSON.stringify({ source: "api/gen-analysis" }));
  if (url.endsWith("/api/predictions/live")) return new Response(JSON.stringify({ summary: { rows: [] } }));
  if (url.endsWith("/api/recorder?mode=health")) return new Response(JSON.stringify({ health: "ok" }));
  if (url.endsWith("/api/analysis-engine")) return new Response(JSON.stringify({ schema: "ipbl.analysis-engine.v1" }));
  if (url.endsWith("/api/operator-intelligence")) return new Response(JSON.stringify({ schema: "ipbl.operator-intelligence.v1" }));
  throw new Error(`unexpected url ${url}`);
});
assert.equal(snapshot.analysisEngine.schema, "ipbl.analysis-engine.v1");
assert.equal(snapshot.operatorIntelligence.schema, "ipbl.operator-intelligence.v1");
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/intelligence-client.test.ts`
Expected: fail until the loader exists.

- [ ] **Step 3: Implement the loader and tab**

```ts
export async function loadIntelligenceSurface(fetchImpl = fetch) {
  const [genAnalysis, predictionRuntime, recorderHealth, analysisEngine, operatorIntelligence] = await Promise.all([
    fetchJson("/api/gen-analysis", fetchImpl),
    fetchJson("/api/predictions/live", fetchImpl),
    fetchJson("/api/recorder?mode=health", fetchImpl),
    fetchJson("/api/analysis-engine", fetchImpl),
    fetchJson("/api/operator-intelligence", fetchImpl),
  ]);
  return { genAnalysis, predictionRuntime, recorderHealth, analysisEngine, operatorIntelligence };
}
```

Add a new `Intelligence` tab to `src/App.tsx`, extend `TabKey` in `src/app/app-types.ts`, and render the summary cards from `IntelligenceTab.tsx`.

- [ ] **Step 4: Run the client test and the production build**

Run:
`node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/intelligence-client.test.ts`

Run:
`npm run build`

Expected: loader test passes and the production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/app/app-types.ts src/app/intelligence-client.ts src/app/IntelligenceTab.tsx tests/intelligence-client.test.ts
git commit -m "feat: add dedicated intelligence tab"
```

### Task 3: Trim the live drawer and route detail into Intelligence

**Files:**
- Modify: `src/app/GameDrawer.tsx`
- Modify: `src/app/LiveTab.tsx`
- Modify: `src/App.tsx`
- Modify: `src/app/app-types.ts`
- Modify: `src/index.css`
- Test: `tests/live-drawer-policy.test.ts`

**Interfaces:**
- Consumes: the existing `DrawerState`, the new `Intelligence` tab handler, and the current live decision fields
- Produces: a live drawer that shows score, live decision, historical risk summary, and a clear link into `Intelligence`, but no long replay/H2H/team-risk dumps by default

- [ ] **Step 1: Write the failing policy test**

```ts
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/app/GameDrawer.tsx", "utf8");
assert.equal(source.includes("Odds movement"), false);
assert.equal(source.includes("H2H block"), false);
assert.equal(source.includes("Team risk block"), false);
```

- [ ] **Step 2: Run the test and confirm it fails before the drawer is trimmed**

Run: `node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-drawer-policy.test.ts`
Expected: fail until the heavy sections are removed.

- [ ] **Step 3: Remove the heavy blocks and add the intelligence handoff**

```tsx
<section className="drawer-section">
  <h3>Intelligence handoff</h3>
  <p className="muted">Detailed replay, H2H, and phase coverage live in the Intelligence tab.</p>
  <button type="button" className="mini-btn" onClick={onOpenIntelligence}>Open Intelligence</button>
</section>
```

Drop the long replay, H2H, team-risk, and matchup-risk sections from the default drawer. Keep the score, player-statistics note, live decision block, and a compact historical risk summary.

- [ ] **Step 4: Run the drawer policy test and the build**

Run:
`node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-drawer-policy.test.ts`

Run:
`npm run build`

Expected: the policy test passes and the build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/app/GameDrawer.tsx src/app/LiveTab.tsx src/app/app-types.ts src/index.css tests/live-drawer-policy.test.ts
git commit -m "feat: trim live drawer and hand off to intelligence"
```

### Task 4: Update docs and run the full verification chain

**Files:**
- Modify: `docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md`
- Modify: `README.md`
- Modify: `docs/PHASE_MASTER_INDEX.md` if the new surface map needs a repository-level pointer
- Modify: `docs/PHASE_CLOSURE_CURRENT_STATE.md` if the phase coverage summary changes

**Interfaces:**
- Consumes: the new frontend intelligence path and the read-only backend summary routes
- Produces: documentation that tells future agents where the backend analysis appears in the UI and what stays hidden

- [ ] **Step 1: Write the docs updates**

Add a short section that says:

```md
Live is for decision speed.
Intelligence is for synthesis, phase coverage, recorder/history health, and Graphify output.
Raw Graphify internals and agnix config stay backend-only.
```

- [ ] **Step 2: Run the repo verification commands**

Run:
`npm run test:analysis-engine`

Run:
`npm run test:operator-intelligence`

Run:
`npm run test:graphify-intelligence`

Run:
`npm run build`

Run:
`npm run validate:phase-master`

Expected: every command exits `0`.

- [ ] **Step 3: Commit**

```bash
git add docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md README.md docs/PHASE_MASTER_INDEX.md docs/PHASE_CLOSURE_CURRENT_STATE.md
git commit -m "docs: map intelligence surface into the frontend"
```
