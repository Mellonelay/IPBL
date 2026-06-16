#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

MEN_ID=1073715
MEN_TAG=ipbl-66-m-pro-b
WOMEN_ID=1073505
WOMEN_TAG=ipbl-66-w-pro-a
PROD_BASE=https://ipbl-minimal-viewer.vercel.app

echo "======================================="
echo "IPBL PHASE MASTER VALIDATION START"
echo "PHASES ARE VALIDATION CHECKPOINTS"
echo "NO UI CHANGES ALLOWED"
echo "======================================="

echo "[PRECHECK] CANONICAL FILES"
test -f AGENTS.md
test -f .agnix.toml
test -f docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md
test -f docs/PHASE_MASTER_INDEX.md
test -f docs/PHASE_MASTER_CHECKLIST.md
test -f docs/PHASE_4_5_EVIDENCE_MANIFEST.md
test -f artifacts/graphify/phase-roadmap.json
test -f artifacts/graphify/god-node-ledger.json
test -f graphify-out/graph.json
test -f graphify-out/GRAPH_REPORT.md
test -f .code-review-graph/graph.db

echo "[STEP 0] AGNIX HARD GATE"
npx agnix@0.32.0 .

echo "[STEP 1] PHASE 0-3 REFERENCE CHECKS"
test -f graphify-out/.graphify_analysis.json
test -f graphify-out/.graphify_ast.json
test -d graphify-out/obsidian
test -f .code-review-graph/graph.db

echo "[STEP 2] PHASE 4 SOURCE ARCHAEOLOGY"
bash scripts/validate-phase-4-5.sh

echo "[STEP 3] PHASE 5 EVIDENCE GRAPH"
test -f artifacts/screenshots/live-proof.png
test -f artifacts/phase-c/SHA256SUMS
test -f artifacts/phase-c/completion-report.json
test -f artifacts/phase-c8/SHA256SUMS
test -f artifacts/phase-c8/completion-report.json
test -f artifacts/phase-c9/SHA256SUMS
test -f artifacts/phase-c9/c9-plan-manifest.json
test -f artifacts/team-statistics/team-statistics-reconciliation-latest.json

echo "[STEP 4] PHASE 6-7 CONFIG CHECKS"
bash scripts/validate-phase-6-7.sh

echo "[STEP 5] PHASE 9 RUNTIME AGENT GRAPH"
test -f artifacts/runtime-agent-graph/runtime-agent-graph.json
npm run test:runtime-agent-graph

echo "[STEP 6] PHASE 10-11 ACTIVE WORKLOAD CHECKS"
bash scripts/validate-phase-10-11.sh

echo "[STEP 7] FINAL AGNIX RECHECK"
npx agnix@0.32.0 .

echo "[STEP 8] BUILD CHECK"
npm run build

echo "[STEP 9] PRODUCTION READ-ONLY CHECKS"
if command -v vercel >/dev/null 2>&1; then
  vercel inspect "${PROD_BASE}" --format=json || echo "vercel inspect unavailable; skipping"
else
  echo "vercel CLI unavailable; skipping inspect"
fi

for url in \
  "${PROD_BASE}/api/results/live" \
  "${PROD_BASE}/api/results" \
  "${PROD_BASE}/api/teams/history" \
  "${PROD_BASE}/api/recorder/health" \
  "${PROD_BASE}/api/ipbl/games/game?id=${MEN_ID}&tag=${MEN_TAG}&lang=ru" \
  "${PROD_BASE}/api/ipbl/box-score?id=${MEN_ID}&tag=${MEN_TAG}&lang=ru" \
  "${PROD_BASE}/api/ipbl/games/game?id=${WOMEN_ID}&tag=${WOMEN_TAG}&lang=ru" \
  "${PROD_BASE}/api/ipbl/box-score?id=${WOMEN_ID}&tag=${WOMEN_TAG}&lang=ru"
do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || printf '000')"
  echo "$url => $code"
done

echo "======================================="
echo "IPBL PHASE MASTER VALIDATION COMPLETE"
echo "======================================="
