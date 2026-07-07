#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "[PHASE 10] IPBL WORKLOAD GRAPH CHECKS"
test -f docs/PHASE_10_11_EVIDENCE_MANIFEST.md
test -f artifacts/workload-graph/ipbl-workload-graph.json
test -f docs/TEAM_STATISTICS_RECONCILIATION.md
test -f docs/TEAM_STATISTICS_PHASE_E2.md
test -f artifacts/team-statistics/team-statistics-reconciliation-latest.json
grep -q "Canonical checkpoint" docs/PHASE_10_11_EVIDENCE_MANIFEST.md
grep -q "scripts/validate-phase-10-11.sh" docs/PHASE_10_11_EVIDENCE_MANIFEST.md

npm run test:ipbl-workload-graph
npm run reconcile:team-statistics
npm run test:approved-divisions
npm run test:team-statistics-reconciliation

echo "[PHASE 11] C9 INTELLIGENCE CHECKS"
test -f docs/phase-c9/C9_OFFICIAL_REVIVAL_AND_EVENTSSTAT_INTELLIGENCE.md
test -f docs/phase-c9/C9_PR23_ROW_LEVEL_RECONCILIATION.md
test -f docs/phase-c9/C9_PR23_SOURCE_RECONCILIATION_AND_EVENTSSTAT_REPROBE.md
test -f artifacts/phase-c9/pr23/row-reconciliation-latest.json
test -f artifacts/phase-c9/pr23/reconciliation-summary.json
test -f artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json
grep -q "Fully complete / reconciled." docs/PHASE_10_11_EVIDENCE_MANIFEST.md

npm run reconcile:c9
npm run reprobe:c9-eventsstat
npm run test:c9-contracts
npm run test:c9-reconciliation
npm run test:c9-active-matched-gate

echo "[PHASE 10-11] COMPLETE"
