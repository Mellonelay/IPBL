# Phase C9 Implementation Scope — PR #23

PR #22 is the C9 proof foundation only. PR #23 is the implementation planning branch and must use Graphify/community/swarm findings before feature work.

Current closure note:
- The repo has proof-foundation evidence for C9, and Phase 11 is now complete at the reconciliation checkpoint.
- The remaining odds-vs-score divergence, recorder enrichment, and movement graph work is separate productization scope. Market/selection timeline parsing and score-history alignment are deterministic contract outputs and remain the evidence surface for future runtime work.
- Do not reopen Phase 11; keep any further odds implementation work outside this reconciliation checkpoint.

## Required implementation tracks

1. Graphify-backed C9 implementation plan.
2. Official source reconciliation: official source vs Results KV vs Recorder vs fallback source.
3. EventsStat live EG/SH/DS reprobe and fixture refresh.
4. Odds movement recorder design with retention/write budget.
5. Operator-facing odds/score divergence features.
6. No production odds deployment until parser tests, source policy, and evidence review pass.

## Required evidence gates

- Local C9/C8 tests.
- Production build.
- SHA manifest integrity.
- Vercel preview inspection.
- GitHub PR/check review, with billing-lock failures classified as NOT RUN rather than source failure.
- Graphify/community impact note attached to implementation PR.

## Out of scope for this planning PR

- No production odds deployment.
- No new divisions.
- No TLS weakening.
- No unverified team mappings.
- No production data deletion or secret rotation.
- No claim that Phase 11 changes the current closed reconciliation checkpoint.
