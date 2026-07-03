# IPBL Overhaul Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the IPBL frontend/backend maintenance surface by splitting the monolithic app shell into focused modules while preserving the current live/results/teams/betting behavior and production contract.

**Architecture:** Keep `api/results/live.ts` as the canonical live envelope and keep `/api/live` as a compatibility wrapper. Move UI orchestration out of `src/App.tsx` into a thin shell plus feature views so the app state, tab rendering, and drawer rendering become independently understandable. Keep the existing route and validation contracts intact while refreshing Graphify after the code moves.

**Tech Stack:** React 19, Vite, TypeScript, Vercel rewrites, Node-based repo tests, Graphify.

## Global Constraints

- Preserve the existing public tabs: Live, Results, Teams, Betting Record.
- Preserve H2H drawer behavior and the live operator decision flow.
- Do not add new runtime dependencies.
- Keep `api/results/live.ts` as the canonical live API source.
- Keep `/api/live` as compatibility behavior only.
- Do not reopen closed phase work or mutate source truth in the frontend.

---

### Task 1: Extract feature views from `src/App.tsx`

**Files:**
- Create: `src/app/LiveTab.tsx`
- Create: `src/app/ResultsTab.tsx`
- Create: `src/app/TeamsTab.tsx`
- Create: `src/app/BettingTab.tsx`
- Create: `src/app/GameDrawer.tsx`
- Create: `src/app/app-types.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ScheduleGame`, `LiveInsight`, `DrawerState`, `CalendarGridMap`, `ResultsMonthMetadata`, and the existing helper functions already used by `App.tsx`.
- Produces: focused view components that only render props and emit callbacks, for example:

```tsx
export type LiveTabProps = {
  games: ScheduleGame[];
  insights: Map<string, LiveInsight>;
  selectedDivisionTag: string;
  onSelectDivisionTag: (tag: string) => void;
  onOpenGame: (game: ScheduleGame, insight?: LiveInsight) => void;
  onOpenH2H: (game: ScheduleGame, insight?: LiveInsight) => void;
};
```

- [ ] **Step 1: Write the extraction targets in place**

Create the new component files as thin wrappers around the JSX that already exists inside `App.tsx`. Keep the props explicit and keep the components dumb.

- [ ] **Step 2: Move the render-only JSX out of `App.tsx`**

Replace the inline Live/Results/Teams/Betting/Drawer blocks with imports from the new feature files.

- [ ] **Step 3: Keep shared behavior in `App.tsx`**

Leave fetch orchestration, selection state, refresh timers, and contract checks in the shell until the next task.

- [ ] **Step 4: Verify the shell still compiles**

Run:

```bash
npm run build
```

Expected: production build completes with the existing app output and no new TypeScript errors.

### Task 2: Reduce `src/App.tsx` to orchestration only

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/app/LiveTab.tsx`
- Modify: `src/app/ResultsTab.tsx`
- Modify: `src/app/TeamsTab.tsx`
- Modify: `src/app/BettingTab.tsx`
- Modify: `src/app/GameDrawer.tsx`
- Modify: `src/app/app-types.ts`

**Interfaces:**
- Consumes: the prop contracts introduced in Task 1.
- Produces: a top-level shell that wires state into the feature views without embedding the full tab JSX.

- [ ] **Step 1: Tighten the shell imports**

Remove duplicated presentation logic from `src/App.tsx` and keep only the orchestration layer.

- [ ] **Step 2: Keep the live contract behavior unchanged**

Preserve the live-source banner, the decision badge, the H2H drawer, and the no-store fetch behavior already verified in the repo tests.

- [ ] **Step 3: Re-run the existing behavior tests**

Run:

```bash
npm run test:ipbl-compat
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-display-state.test.ts
npm run test:bookmaker-live
```

Expected: all three pass with the same contract behavior as before the extraction.

- [ ] **Step 4: Re-run the production build**

Run:

```bash
npm run build
```

Expected: clean production build with the same Vite output and no route regressions.

### Task 3: Refresh graph and production proof

**Files:**
- Modify: `graphify-out/graph.json`
- Modify: `graphify-out/GRAPH_REPORT.md`
- Modify: `graphify-out/graph.html`
- Modify: `graphify-out/obsidian/` outputs

**Interfaces:**
- Consumes: the extracted frontend shell and the current live/backend contract.
- Produces: a refreshed repo graph that reflects the new frontend boundaries.

- [ ] **Step 1: Refresh Graphify**

Run:

```bash
graphify update .
```

Expected: graph refresh completes and the refreshed graph shows the new shell modules instead of one giant shell hub.

- [ ] **Step 2: Verify Vercel deployment**

Run:

```bash
vercel ls --scope melloenfrwrks-projects
vercel inspect https://ipbl-minimal-viewer.vercel.app --format=json --scope melloenfrwrks-projects
```

Expected: the latest production deployment is `Ready`.

- [ ] **Step 3: Verify GitHub deployment status**

Run:

```bash
gh api repos/Mellonelay/IPBL/deployments?per_page=1
gh api repos/Mellonelay/IPBL/deployments/<deployment-id>/statuses
```

Expected: the newest production deployment status is `success`.
