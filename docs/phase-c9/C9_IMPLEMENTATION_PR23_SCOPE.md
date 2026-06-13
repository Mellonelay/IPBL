# Phase C9 Implementation Scope — PR #23

PR #22 is the C9 proof foundation only. PR #23 is the implementation planning branch and must use Graphify/community/swarm findings before feature work.

## Required implementation tracks

1. Graphify-backed C9 implementation plan.
2. Official source reconciliation: official source vs Results KV vs Recorder vs fallback source.
3. EventsStat live EG/SH/DS reprobe and fixture refresh.
4. Market and selection ID mapping.
5. Score-history timestamp alignment.
6. Odds movement recorder design with retention/write budget.
7. Operator-facing odds/score divergence features.
8. No production odds deployment until parser tests, source policy, and evidence review pass.

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
