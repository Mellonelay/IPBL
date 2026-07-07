# IPBL Repo Cleanup Report

Audit date: 2026-07-07

Scope:
- live GitHub repo root at `Mellonelay/IPBL`;
- isolated audit worktree at `/root/repos/IPBL-worktrees/ipbl-cleanup-audit`;
- repo-root docs, runtime surfaces, evidence surfaces, and agent instruction files.

This report is meant to make future agent runs faster and safer. It separates real runtime code from evidence, generated outputs, and operator-only material.

## What Was Verified

- The live repository root matches the expected IPBL structure.
- The repo is heavily evidence-driven: `artifacts/` and `graphify-out/` are not incidental clutter; they encode validation history and Graphify state.
- The active runtime surfaces are `src/`, `api/`, `lib/`, `public/`, and `workers/`.
- The repo already has a clear phase and closure vocabulary in `docs/PHASE_*` and `docs/superpowers/*`.
- The production deployment at `https://ipbl-cleanup-audit.vercel.app` is live and responds in browser verification.

## Repo Inventory

Tracked files by top-level root segment:

- `graphify-out/`: 436
- `tests/`: 88
- `artifacts/`: 72
- `lib/`: 65
- `docs/`: 61
- `src/`: 40
- `scripts/`: 33
- `api/`: 15
- `.codex/`: 11
- `.agenteam/`: 10
- `ops/`: 8
- `workers/`: 5
- `.claude/`: 4
- `.jules/`: 4
- `public/`: 3
- `.agents/`: 2
- `.github/`: 2
- single-file roots include `.agnix.toml`, `.code-review-graph`, `.gitignore`, `.vercelignore`, `AGENTS.md`, `README.md`, `fixtures/`, `index.html`, `package.json`, `vercel.json`, `vite.config.ts`, and `wrangler.jsonc`.

Largest tracked files observed:

- `.code-review-graph/graph.db`
- `public/bet_history_clean.json`
- `artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json`
- `artifacts/phase-c9/pr23/test-active-matched-gate.json`
- `package-lock.json`
- `graphify-out/graph.json`
- `graphify-out/.graphify_extract.json`
- `artifacts/debug_data.json`

## Key Runtime Surfaces

- `src/App.tsx` is the highest-connectivity frontend entry point in the graph and wires live surface, betting memory, and H2H flow together.
- `src/components/BettingRecord.tsx` is a leaf viewer surface in the graph. It is useful UI, but it is not a core dependency hub.
- `api/results.ts` (including the live mode rewrite), `api/gen-analysis.ts`, `api/operator-intelligence.ts`, and `api/analysis-engine.ts` are the main server-side operator surfaces.
- The old `api/admin/backfill-results.ts` entry was folded into `api/cron/cron-sync-results.ts` so the repo stays under the Vercel Hobby 12-function limit.
- `workers/graphify-intelligence/` holds the worker-side intelligence orchestration path.

## Evidence And Generated Surfaces

These should be treated as source-adjacent evidence, not runtime code:

- `artifacts/`
- `graphify-out/`
- `docs/phase-c/`, `docs/phase-c8/`, `docs/phase-c9/`
- `docs/PHASE_*`
- `docs/superpowers/plans/`
- `fixtures/` and `tests/fixtures/`

Do not delete these casually. They exist because the repo uses evidence-backed closure, graph-based archaeology, and validation snapshots.

## Cleanup Decisions Made In This Pass

- `agents.md` was removed because it duplicated `AGENTS.md` without adding any independent instructions.
- Legacy root helper scripts (`deploy-vercel.sh`, `hydrate_final.ps1`, `hydrate_hybrid.ps1`, `hydrate_master.ps1`, `netlify.toml`, `ipbl-hunt-live-fixture.json`) were removed because they had no live references in the repo.
- The separate admin backfill route was folded into the existing cron Results route; `/api/admin/backfill-results` now rewrites to `api/cron/cron-sync-results.ts?mode=backfill`.
- `dist/` was added to `.gitignore` so build output stays out of the repository.
- `README.md` was updated with a real repository map and a pointer to this report.
- The README also records the final production alias and the compact routing rule for future agents.

## Current Maintenance Boundaries

- `AGENTS.md` is canonical for root agent behavior.
- `dist/` is disposable build output.
- `artifacts/` and `graphify-out/` are intentionally kept because they support closure, auditability, and graph-backed reasoning.

## Cleanup Candidates To Review Later

These are not removed in this pass because they may still be required by tooling or evidence workflows:

- `.code-review-graph/graph.db`
- `graphify-out/cache/`
- `graphify-out/.graphify_*`
- `artifacts/*` phase bundles
- duplicate agent metadata directories under `.agenteam/`, `.agents/`, `.claude/`, `.codex/`, and `.jules/`

The last group is not automatically dead weight. It is workflow metadata for different agent surfaces, so it should be reconciled by policy before deletion.

## How To Reuse This Repo Safely

1. Read `AGENTS.md`.
2. Read `README.md`.
3. Use `graphify` for architecture questions.
4. Treat `artifacts/` and `graphify-out/` as evidence layers.
5. Add new runtime code in `src/`, `api/`, `lib/`, or `workers/` only when it changes behavior.

## Bottom Line

The repo is not mostly junk; it is mostly evidence-heavy. The actual cleanup win is to keep the contract surfaces documented, keep build output ignored, and stop future agents from reading conflicting instruction files.

The final production alias is `https://ipbl-cleanup-audit.vercel.app`, and Lightpanda browser verification confirmed the app shell loads there.
