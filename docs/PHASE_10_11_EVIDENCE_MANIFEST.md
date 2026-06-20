# Phase 10-11 Evidence Manifest

Source of truth:
- [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)
- [docs/TEAM_STATISTICS_RECONCILIATION.md](/root/repos/IPBL/docs/TEAM_STATISTICS_RECONCILIATION.md)
- [docs/TEAM_STATISTICS_PHASE_E2.md](/root/repos/IPBL/docs/TEAM_STATISTICS_PHASE_E2.md)
- [docs/phase-c9/C9_OFFICIAL_REVIVAL_AND_EVENTSSTAT_INTELLIGENCE.md](/root/repos/IPBL/docs/phase-c9/C9_OFFICIAL_REVIVAL_AND_EVENTSSTAT_INTELLIGENCE.md)
- [docs/phase-c9/C9_PR23_ROW_LEVEL_RECONCILIATION.md](/root/repos/IPBL/docs/phase-c9/C9_PR23_ROW_LEVEL_RECONCILIATION.md)
- [docs/phase-c9/C9_PR23_SOURCE_RECONCILIATION_AND_EVENTSSTAT_REPROBE.md](/root/repos/IPBL/docs/phase-c9/C9_PR23_SOURCE_RECONCILIATION_AND_EVENTSSTAT_REPROBE.md)

This manifest is read-only. It maps existing workload and C9 evidence into the canonical Phase 10 and Phase 11 checkpoints.

## Phase 10 - IPBL Workload Graph

### Status

- Complete / materialized.

### Canonical checkpoint

- [artifacts/workload-graph/ipbl-workload-graph.json](/root/repos/IPBL/artifacts/workload-graph/ipbl-workload-graph.json)

### Validation entrypoint

- [scripts/validate-phase-10-11.sh](/root/repos/IPBL/scripts/validate-phase-10-11.sh)

### Existing evidence

- Workload and reconciliation docs:
  - [docs/TEAM_STATISTICS_RECONCILIATION.md](/root/repos/IPBL/docs/TEAM_STATISTICS_RECONCILIATION.md)
  - [docs/TEAM_STATISTICS_PHASE_E2.md](/root/repos/IPBL/docs/TEAM_STATISTICS_PHASE_E2.md)
  - [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)
- Active artifacts:
  - [artifacts/workload-graph/ipbl-workload-graph.json](/root/repos/IPBL/artifacts/workload-graph/ipbl-workload-graph.json)
  - [artifacts/team-statistics/team-statistics-reconciliation-latest.json](/root/repos/IPBL/artifacts/team-statistics/team-statistics-reconciliation-latest.json)
  - [artifacts/phase-c9/c9-plan-manifest.json](/root/repos/IPBL/artifacts/phase-c9/c9-plan-manifest.json)
  - [artifacts/phase-c9/c9-source-proof-summary.json](/root/repos/IPBL/artifacts/phase-c9/c9-source-proof-summary.json)
  - [artifacts/phase-c9/history-graph-proof.json](/root/repos/IPBL/artifacts/phase-c9/history-graph-proof.json)
  - [artifacts/phase-c9/history-graph-schema-summary.json](/root/repos/IPBL/artifacts/phase-c9/history-graph-schema-summary.json)
- Tests already proving the workload boundaries:
  - [tests/ipbl-workload-graph.test.ts](/root/repos/IPBL/tests/ipbl-workload-graph.test.ts)
  - [tests/ipbl-approved-divisions.test.mjs](/root/repos/IPBL/tests/ipbl-approved-divisions.test.mjs)
  - [tests/team-statistics-reconciliation.test.mjs](/root/repos/IPBL/tests/team-statistics-reconciliation.test.mjs)
  - [tests/team-statistics.test.ts](/root/repos/IPBL/tests/team-statistics.test.ts)
  - [tests/team-history-results.test.ts](/root/repos/IPBL/tests/team-history-results.test.ts)
  - [tests/team-history-official-live.test.ts](/root/repos/IPBL/tests/team-history-official-live.test.ts)
  - [tests/team-history-official-recent-calendar.test.ts](/root/repos/IPBL/tests/team-history-official-recent-calendar.test.ts)

### Remaining gap

- The workload graph is operational and validated, but it is still spread across Team Statistics, H2H, Results, Recorder, and live-source artifacts.
- The manifest is therefore a durable index, not a new runtime layer.

## Phase 11 - C9 Intelligence

### Status

- Proof-foundation partial.

### Canonical checkpoint

- [artifacts/phase-c9/pr23/reconciliation-summary.json](/root/repos/IPBL/artifacts/phase-c9/pr23/reconciliation-summary.json)

### Validation entrypoint

- [scripts/validate-phase-10-11.sh](/root/repos/IPBL/scripts/validate-phase-10-11.sh)

### Existing evidence

- C9 docs:
  - [docs/phase-c9/C9_OFFICIAL_REVIVAL_AND_EVENTSSTAT_INTELLIGENCE.md](/root/repos/IPBL/docs/phase-c9/C9_OFFICIAL_REVIVAL_AND_EVENTSSTAT_INTELLIGENCE.md)
  - [docs/phase-c9/C9_PR23_ROW_LEVEL_RECONCILIATION.md](/root/repos/IPBL/docs/phase-c9/C9_PR23_ROW_LEVEL_RECONCILIATION.md)
  - [docs/phase-c9/C9_PR23_SOURCE_RECONCILIATION_AND_EVENTSSTAT_REPROBE.md](/root/repos/IPBL/docs/phase-c9/C9_PR23_SOURCE_RECONCILIATION_AND_EVENTSSTAT_REPROBE.md)
  - [docs/phase-c9/C9_IMPLEMENTATION_PR23_SCOPE.md](/root/repos/IPBL/docs/phase-c9/C9_IMPLEMENTATION_PR23_SCOPE.md)
- C9 artifacts:
  - [artifacts/phase-c9/pr23/row-reconciliation-latest.json](/root/repos/IPBL/artifacts/phase-c9/pr23/row-reconciliation-latest.json)
  - [artifacts/phase-c9/pr23/reconciliation-summary.json](/root/repos/IPBL/artifacts/phase-c9/pr23/reconciliation-summary.json)
  - [artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json](/root/repos/IPBL/artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json)
  - [artifacts/phase-c9/pr23/test-active-matched-gate.json](/root/repos/IPBL/artifacts/phase-c9/pr23/test-active-matched-gate.json)
  - [artifacts/phase-c9/pr23/live-reprobe-attempt-1-20260613T113124Z.json](/root/repos/IPBL/artifacts/phase-c9/pr23/live-reprobe-attempt-1-20260613T113124Z.json)
- C9 tests:
  - [tests/eventsstat-contracts.test.ts](/root/repos/IPBL/tests/eventsstat-contracts.test.ts)
  - [tests/phase-c9-row-reconciliation.test.mjs](/root/repos/IPBL/tests/phase-c9-row-reconciliation.test.mjs)
  - [tests/phase-c9-active-matched-gate.test.mjs](/root/repos/IPBL/tests/phase-c9-active-matched-gate.test.mjs)

### Remaining gap

- Market/selection mapping, score-history alignment, odds-vs-score divergence, recorder enrichment, and movement graph work remain open in the roadmap.
- C9 evidence is strong enough to support reconciliation and contract validation, but not enough to claim production odds deployment.
- Phase 11 stays partial until the repo either proves the remaining C9 boundaries or records a formal policy decision to keep it support-ready.

## Recommended validation

```bash
npm run reconcile:team-statistics
npm run test:team-statistics-reconciliation
npm run reconcile:c9
npm run reprobe:c9-eventsstat
npm run test:c9-contracts
npm run test:c9-reconciliation
npm run test:c9-active-matched-gate
```

## Scope boundaries

- No new odds or betting behavior is introduced here.
- This manifest only documents the existing workload and C9 proof surface.
