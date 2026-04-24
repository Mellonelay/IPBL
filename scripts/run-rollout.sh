#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== PHASE 0–1: Local token + Vercel env list ==="
load_env_local() {
  local f=".env.local"
  [[ -f "$f" ]] || return 0
  local tmp
  tmp="$(mktemp)"
  tr -d '\r' < "$f" > "$tmp"
  set -a
  # shellcheck disable=SC1090
  source "$tmp"
  set +a
  rm -f "$tmp"
}
load_env_local

pull_cron_secret_from_vercel() {
  [[ -n "${CRON_SECRET:-}" ]] && return 0
  local pullf
  pullf="$(mktemp)"
  if ./node_modules/.bin/vercel env pull "$pullf" --environment=production --yes --token "$VERCEL_TOKEN" 2>/dev/null; then
    tr -d '\r' < "$pullf" > "${pullf}.clean" && mv "${pullf}.clean" "$pullf"
    set -a
    # shellcheck disable=SC1090
    source "$pullf"
    set +a
  fi
  rm -f "$pullf"
}

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Missing VERCEL_TOKEN — cannot deploy"
  exit 1
fi
echo "VERCEL_TOKEN: present (hidden)"

echo ""
echo "npx vercel env ls (names only, masked):"
./node_modules/.bin/vercel env ls --token "$VERCEL_TOKEN" 2>&1 || true

if ! ./node_modules/.bin/vercel env ls --token "$VERCEL_TOKEN" 2>/dev/null | grep -q "CRON_SECRET"; then
  echo "CRON_SECRET missing in Vercel → abort"
  exit 1
fi
echo "CRON_SECRET: listed on project"

pull_cron_secret_from_vercel
if [[ -n "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET: available for backfill (from env or vercel pull)"
else
  echo "CRON_SECRET: not in shell — backfill will fail unless vercel env pull works"
fi

echo ""
echo "=== PHASE 2: install + build + deploy ==="
npm install
npm run build
DEPLOY_OUT=$(./node_modules/.bin/vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1)
echo "$DEPLOY_OUT"
echo "$DEPLOY_OUT" | tail -5

echo ""
echo "=== PHASE 3: /api/results before backfill ==="
CODE=$(curl -s -o /tmp/res.txt -w "%{http_code}" \
  "https://ipbl-minimal-viewer.vercel.app/api/results?year=2026&month=3&division=ipbl-66-m-pro-a" || true)
echo "HTTP $CODE"
head -c 400 /tmp/res.txt || true
echo ""
if [[ "$CODE" == "500" ]] || grep -q 'kv_env_missing' /tmp/res.txt 2>/dev/null; then
  echo "KV ENV ISSUE — STOP"
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  pull_cron_secret_from_vercel
fi
if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET not available — add to .env.local or run: vercel env pull"
  exit 1
fi

echo ""
echo "=== PHASE 4: Backfill March ==="
BACKFILL_URL=https://ipbl-minimal-viewer.vercel.app CRON_SECRET="$CRON_SECRET" \
  node scripts/backfill-results.mjs --year 2026 --month 3 --all

echo ""
echo "=== PHASE 4: Backfill April ==="
BACKFILL_URL=https://ipbl-minimal-viewer.vercel.app CRON_SECRET="$CRON_SECRET" \
  node scripts/backfill-results.mjs --year 2026 --month 4 --all

echo ""
echo "=== PHASE 5: /api/results after backfill ==="
curl -s "https://ipbl-minimal-viewer.vercel.app/api/results?year=2026&month=3&division=ipbl-66-m-pro-a" -o /tmp/res2.txt
if ! grep -q '"calendar"' /tmp/res2.txt 2>/dev/null; then
  echo "BACKFILL FAILED"
  head -c 500 /tmp/res2.txt
  exit 1
fi
if command -v jq >/dev/null 2>&1; then
  jq '.meta, (.calendar | keys | length)' /tmp/res2.txt
else
  head -c 300 /tmp/res2.txt
  echo ""
fi

echo ""
echo "=== Done ==="
echo "Production: https://ipbl-minimal-viewer.vercel.app"