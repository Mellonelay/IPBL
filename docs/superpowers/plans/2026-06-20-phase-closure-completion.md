# IPBL Phase Closure Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining support-ready IPBL phases by normalizing evidence, tightening packaging, and aligning validation so the repo’s phase ledger, skills, and runtime proofs all agree on what is complete.

**Architecture:** Treat the current codebase as the source of truth and the phase ledgers as the packaging layer. Finish the remaining work by making the documentation, skill packaging, agnix gates, and evidence manifests converge on the same closure state, while keeping backend runtime behavior unchanged unless a phase explicitly requires productization. Phase 11 is the only phase that may need a product decision because the current evidence manifest marks it as proof-foundation partial rather than complete.

**Tech Stack:** Markdown docs, TypeScript, existing IPBL tests, Vercel CLI, GitHub CLI, agnix, Graphify artifacts, current Codex/Superpowers skills.

---

### Task 1: Reconcile the phase ledgers and define the closure contract

**Files:**
- Modify: `docs/PHASE_MASTER_CHECKLIST.md`
- Modify: `docs/PHASE_MASTER_INDEX.md`
- Modify: `docs/PHASE_CLOSURE_CURRENT_STATE.md`
- Modify: `docs/PHASE_FINAL_MASTER_LEDGER.md`

- [ ] **Step 1: Make the ledgers agree on the same phase categories**

```md
Keep the existing completion counts, but make the naming consistent:
- `complete`
- `support-ready`
- `proof-foundation partial`

Do not rename a support-ready phase to complete unless the evidence manifest and validation entrypoints both prove it.
```

- [ ] **Step 2: Add a one-line closure rule for phase promotion**

```md
A phase may move from support-ready to complete only when:
- its evidence manifest has a deterministic artifact or validation entrypoint,
- the repo contains a passing test or reproducible verification command,
- the phase does not depend on an unresolved policy decision.
```

- [ ] **Step 3: Verify the ledger diff stays doc-only**

Run:
```bash
git diff -- docs/PHASE_MASTER_CHECKLIST.md docs/PHASE_MASTER_INDEX.md docs/PHASE_CLOSURE_CURRENT_STATE.md docs/PHASE_FINAL_MASTER_LEDGER.md
```

Expected:
- Only status wording and closure-contract text change.
- No runtime code changes appear in this task.

### Task 2: Package the support-ready skill surface

**Files:**
- Modify: `docs/PHASE_6_7_EVIDENCE_MANIFEST.md`
- Modify: `AGENTS.md`
- Modify: `.agents/skills/ipbl/SKILL.md`
- Modify: `.claude/skills/ipbl/SKILL.md`
- Modify: `.codex/AGENTS.md`
- Modify: `docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md`

- [ ] **Step 1: Split the broad IPBL skill baseline into narrow operator workflows**

```md
Add explicit entries for:
- Graphify source archaeology
- live-source repair
- Vercel verification
- evidence finalization
- GEN planning

Each entry should say what it owns and what it does not own.
```

- [ ] **Step 2: Align the repo skill instructions with the new packaging**

```md
Document that:
- frontend owns presentation only,
- backend owns source truth and validation,
- skill packaging is a support layer, not a product feature.
```

- [ ] **Step 3: Verify the packaging is discoverable**

Run:
```bash
rg -n "Graphify source archaeology|live-source repair|Vercel verification|evidence finalization|GEN planning" AGENTS.md .agents/skills/ipbl/SKILL.md .claude/skills/ipbl/SKILL.md .codex/AGENTS.md docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md
```

Expected:
- Every narrow workflow name is present exactly where the repo expects it.

### Task 3: Normalize the evidence graph and supersession story

**Files:**
- Modify: `docs/PHASE_4_5_EVIDENCE_MANIFEST.md`
- Modify: `docs/PHASE_10_11_EVIDENCE_MANIFEST.md`
- Modify: `docs/PHASE_MASTER_INDEX.md`
- Modify: `artifacts/evidence/evidence-supersession-index.json`
- Modify: `artifacts/evidence/ipbl-phase-closure-upgrade-summary.json`

- [ ] **Step 1: Make the evidence manifests point to the canonical durable artifacts**

```md
Each manifest should list:
- the canonical evidence file,
- the current validation entrypoint,
- the remaining gap in one sentence,
- whether the phase is ready to close or still blocked.
```

- [ ] **Step 2: Make supersession explicit**

```json
{
  "phase": 5,
  "status": "support-ready",
  "supersedes": ["older evidence bundles"],
  "currentCanonicalArtifact": "docs/PHASE_4_5_EVIDENCE_MANIFEST.md"
}
```

- [ ] **Step 3: Re-run the evidence index sanity check**

Run:
```bash
node -e "const s=require('./artifacts/evidence/evidence-supersession-index.json'); console.log(Object.keys(s).length)"
```

Expected:
- The index loads without JSON errors.
- The canonical artifact list matches the manifest headers.

### Task 4: Finish the validation gates for phases 6 and 7

**Files:**
- Modify: `.agnix.toml`
- Modify: `scripts/validate-phase-master.sh`
- Modify: `scripts/validate-phase-6-7.sh`
- Modify: `package.json`

- [ ] **Step 1: Tighten agnix and phase validation into one deterministic gate**

```toml
# Keep the local gate explicit and path-based.
# Do not add unsupported include flags.
```

- [ ] **Step 2: Ensure the phase-6/7 gate exercises the exact documented commands**

```bash
npx agnix@0.32.0 .
bash scripts/validate-phase-6-7.sh
bash scripts/validate-phase-master.sh
```

- [ ] **Step 3: Verify the gate outputs remain clean**

Expected:
- agnix returns `0 errors`
- master validation exits `0`
- no new runtime behavior is introduced

### Task 5: Resolve the Phase 11 proof gap explicitly

**Files:**
- Modify: `docs/PHASE_10_11_EVIDENCE_MANIFEST.md`
- Modify: `docs/phase-c9/C9_IMPLEMENTATION_PR23_SCOPE.md`
- Modify: `tests/eventsstat-contracts.test.ts`
- Modify: `tests/phase-c9-row-reconciliation.test.mjs`
- Modify: `tests/phase-c9-active-matched-gate.test.mjs`
- Modify: `scripts/validate-phase-10-11.sh`

- [ ] **Step 1: State the unresolved proof boundary in one sentence**

```md
Phase 11 cannot be marked complete until the repo either proves the remaining C9 intelligence boundaries or formally accepts the current proof-foundation partial policy.
```

- [ ] **Step 2: Add the missing proof or close the policy gate**

```md
Choose one path:
- prove the missing market/selection mapping and odds-vs-score divergence boundaries with new evidence and tests, or
- keep the phase support-ready and document the policy decision explicitly.
```

- [ ] **Step 3: Run the C9 validation commands**

Run:
```bash
npm run test:c9-contracts
npm run test:c9-reconciliation
npm run test:c9-active-matched-gate
bash scripts/validate-phase-10-11.sh
```

Expected:
- Either the proof is now strong enough to promote the phase, or the manifest states the exact policy blocker in durable form.

### Task 6: Confirm frontend/backend sync remains intact

**Files:**
- Modify: `src/App.tsx`
- Modify: `api/results/live.ts`
- Modify: `tests/live-feed-freshness.test.ts`
- Modify: `docs/PHASE_CLOSURE_CURRENT_STATE.md`

- [ ] **Step 1: Keep the live UI contract stable**

```ts
const res = await fetch("/api/results/live");
```

- [ ] **Step 2: Keep the backend response shape stable**

```ts
return {
  games: mergedGames,
  status: {
    source,
    bookmakerSourceFailures: bookmakerFallbackFailures,
  },
};
```

- [ ] **Step 3: Re-run the live and recorder checks**

Run:
```bash
npm run test:bookmaker-live
node --loader ./tests/ipbl-source/ts-extension-loader.mjs tests/live-feed-freshness.test.ts
npm run build
```

Expected:
- Live UI still renders from `/api/results/live`
- Recorder status still reports the current live slate correctly
- No bookmaker fetch regression returns on the happy path

## Self-Review

- No placeholders remain.
- Phases 2, 3, 5, 6, 7, and 11 are treated as support-ready or proof-boundary work, not as already complete.
- The plan does not claim phase 11 is complete without a policy or evidence decision.
- Frontend presentation and backend source truth remain separated.

