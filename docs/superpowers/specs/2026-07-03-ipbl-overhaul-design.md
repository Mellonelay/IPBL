# IPBL Overhaul Design

## Problem

IPBL has accumulated a lot of narrow fixes because the core contracts are spread across too many files:

- `src/App.tsx` is a 1041-line shell that owns tab state, fetching, drawer state, and UI orchestration.
- The live backend is split across `lib/server/live-feed.ts`, `lib/server/bookmaker-live.ts`, `lib/server/results-hardening.ts`, `lib/server/live-recorder.ts`, `lib/server/ipbl-compat.ts`, and route wiring in `vercel.json`.
- The deployment contract had drifted enough that Vercel hit the Hobby-plan serverless-function limit until the live compatibility route was collapsed.

The graph refresh confirms the current hubs are concentrated around the same small set of files:

1. `src/App.tsx`
2. `lib/server/bookmaker-live.ts`
3. `lib/server/results-hardening.ts`
4. `lib/server/live-recorder.ts`
5. `lib/server/live-feed.ts`
6. `lib/server/ipbl-compat.ts`
7. `src/results/calendar.ts`
8. `src/api/client.ts`
9. `src/operator/engine.ts`
10. `vercel.json`

The history map shows why the repo reached 61 PRs and a few hundred commits: each fix had to preserve a live contract while the production surface kept changing. The rebuild should reduce repeated plumbing, not reduce verification.

## Goals

- Preserve the existing public tabs and UX areas:
  - Live
  - Results
  - Teams
  - Betting Record
  - H2H / drawer behavior
- Keep the production route contract stable for current consumers.
- Reduce the number of places that know how to assemble live data.
- Make the app shell smaller and easier to reason about.
- Keep Graphify, validation, and deployment proofs current after changes.

## Non-Goals

- Do not reopen completed phase work.
- Do not replace the app with a new framework.
- Do not add new runtime dependencies.
- Do not remove compatibility behavior that still protects existing callers.

## Recommended Architecture

### 1. Frontend shell extraction

Split `src/App.tsx` into a thin orchestrator plus feature modules:

- `src/app/AppShell.tsx` for top-level tab/drawer orchestration.
- `src/app/live/LiveTab.tsx` for live cards, banners, and filtering.
- `src/app/results/ResultsTab.tsx` for calendar and drill-in behavior.
- `src/app/teams/TeamsTab.tsx` for team statistics.
- `src/app/betting/BettingTab.tsx` for betting memory and record surfaces.
- `src/app/drawer/GameDrawer.tsx` for the detail panel.
- `src/app/useAppController.ts` for shared state and fetch coordination.

This keeps rendering concerns separated from data fetching and game-selection state.

### 2. Backend service boundary consolidation

Keep the backend surface centered around one shared live-feed builder:

- `lib/server/live-feed.ts` remains the shared source of truth for the live envelope.
- `lib/server/bookmaker-live.ts` remains the upstream bookmaker adapter.
- `lib/server/results-hardening.ts` and `lib/server/live-recorder.ts` remain the fidelity and recorder layers.
- `api/results/live.ts` stays the canonical live API route.
- `/api/live` becomes a compatibility wrapper, not a separate source path.

The aim is to keep compatibility while avoiding duplicate source-of-truth logic.

### 3. Deployment contract simplification

Keep `vercel.json` focused on rewrites that actually need to exist in production.

- Preserve the app rewrite.
- Preserve the results/live route.
- Preserve recorder and results routes only where they are still actively consumed.
- Avoid extra function surfaces that do not add user value.

This is the layer that already caused a production failure, so it should stay explicit and minimal.

## Execution Plan

1. Extract the frontend shell into a small controller plus feature components.
2. Keep live/results behavior identical while moving the UI plumbing out of `src/App.tsx`.
3. Add or update tests for the extracted controller and the live compatibility route.
4. Re-run the graphify update so the repository graph matches the new boundaries.
5. Verify locally with build/tests, then verify production via Vercel and GitHub deployment status.

## Validation

- `npm run test:ipbl-compat`
- `npm run build`
- `graphify update .`
- `vercel inspect <deployment> --logs`
- GitHub deployment status for the pushed commit

## Decision

This is a contract-first simplification, not a rewrite. The correct first move is to carve the app shell down and keep the backend shared-feed boundary explicit.
