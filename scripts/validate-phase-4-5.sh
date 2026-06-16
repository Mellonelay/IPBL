#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "[PHASE 4] SOURCE ARCHAEOLOGY CHECKS"
npm run test:ipbl-source
npm run test:bookmaker-live
npm run test:h2h-freshness
npm run test:h2h-continuity
npm run test:ipbl-compat

echo "[PHASE 5] EVIDENCE GRAPH CHECKS"
npm run test:results-hardening
npm run test:recorder
npm run test:approved-divisions
npm run test:team-statistics-reconciliation
npm run test:c9-contracts
npm run test:c9-reconciliation
npm run test:c9-active-matched-gate

echo "[PHASE 4-5] ARTIFACT CHECKS"
test -f artifacts/phase-c8/source-health-contract.json
test -f artifacts/phase-c8/live-source-health-evaluation.json
test -f artifacts/phase-c8/endpoint-source-registry.json
test -f artifacts/phase-c9/c9-source-proof-summary.json
test -f artifacts/phase-c9/pr23/reconciliation-summary.json
test -f artifacts/screenshots/live-proof.png
test -f graphify-out/graph.json
test -f graphify-out/GRAPH_REPORT.md

echo "[PHASE 4-5] COMPLETE"
