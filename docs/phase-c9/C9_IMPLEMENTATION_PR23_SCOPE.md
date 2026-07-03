# Phase C9 Implementation Scope — PR #23

PR #22 is the C9 proof foundation only. PR #23 is the implementation planning branch and must use Graphify/community/swarm findings before feature work.

Current closure note:
- The repo has proof-foundation evidence for C9, but Phase 11 remains support-ready / proof-foundation partial.
- The remaining gap is odds-vs-score divergence, recorder enrichment, and movement graph productization. Market/selection timeline parsing and score-history alignment are now deterministic contract outputs, but they are still evidence surfaces rather than production features.
- Do not promote Phase 11 to complete without either new proof or an explicit policy decision to keep it support-ready.

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
- No claim that Phase 11 is complete until the proof boundary above is closed.
