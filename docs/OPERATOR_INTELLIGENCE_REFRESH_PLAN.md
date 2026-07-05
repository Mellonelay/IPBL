# Operator Intelligence Refresh Plan

Phase 12 remains complete, but its evidence should be refreshed whenever upstream evidence changes.

## Inputs

- [artifacts/operator-intelligence/operator-intelligence.json](/root/repos/IPBL/artifacts/operator-intelligence/operator-intelligence.json)
- [src/operator/data.ts](/root/repos/IPBL/src/operator/data.ts)
- [lib/server/operator-intelligence.ts](/root/repos/IPBL/lib/server/operator-intelligence.ts)
- [tests/operator-intelligence.test.ts](/root/repos/IPBL/tests/operator-intelligence.test.ts)
- [artifacts/team-statistics/team-statistics-reconciliation-latest.json](/root/repos/IPBL/artifacts/team-statistics/team-statistics-reconciliation-latest.json)
- [docs/H2H_FRESHNESS_REPAIR.md](/root/repos/IPBL/docs/H2H_FRESHNESS_REPAIR.md)
- [docs/H2H_CONTINUITY_REPAIR.md](/root/repos/IPBL/docs/H2H_CONTINUITY_REPAIR.md)
- [artifacts/phase-c9/pr23/row-reconciliation-latest.json](/root/repos/IPBL/artifacts/phase-c9/pr23/row-reconciliation-latest.json)
- [artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json](/root/repos/IPBL/artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json)

## Refresh commands

- `npm run test:operator-intelligence`
- `npm run test:ipbl-workload-graph`
- `npm run test:bookmaker-live`
- `npm run test:c9-contracts`
- `npm run test:c9-reconciliation`
- `npm run test:c9-active-matched-gate`

## Backtest loop

1. Refresh the supporting evidence artifacts.
2. Rebuild the operator intelligence report from repository-backed inputs.
3. Re-run the operator intelligence test.
4. Compare the new report against the canonical artifact.
5. Do not enable recommendations while the report remains evidence-only.

## Data-quality scoring

- Weight recorder coverage first.
- Weight H2H freshness second.
- Weight odds and reconciliation coverage next.
- Penalize stale or conflicting live rows.
- Keep the score descriptive until holdout validation becomes release-grade.

## Evidence dependencies

- Recorder alignment and live division coverage.
- H2H freshness repair and continuity repair.
- Odds movement and quarter-based backtest evidence.
- Live quarter-flow evidence from the recorder/replay timeline and live pattern layer.
- Graphify-backed live signal synthesis from the worker orchestrator.
- C9 row reconciliation and EventsStat contracts.
- Workload graph evidence that binds the surface together.

## Current gaps

- Recommendations are disabled.
- The mode remains `evidence_only`.
- Holdout validation is still blocked until recorder, H2H, odds, and backtest evidence are all release-grade.
- Browser proof is not part of the operator-intelligence artifact itself.

## Validation steps

1. Parse the JSON artifact.
2. Run the operator-intelligence test.
3. Confirm the artifact matches `buildOperatorIntelligenceReport()`.
4. Re-run the supporting workload and reconciliation tests when upstream evidence changes.
5. Re-run the live quarter-flow and Graphify intelligence tests when the betting evidence model changes.
