#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
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
if [[ -z "${CRON_SECRET:-}" ]] && [[ -n "${VERCEL_TOKEN:-}" ]]; then
  pullf="$(mktemp)"
  ./node_modules/.bin/vercel env pull "$pullf" --environment=production --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
  if [[ -f "$pullf" ]]; then
    tr -d '\r' < "$pullf" > "${pullf}.c" && mv "${pullf}.c" "$pullf"
    set -a
    # shellcheck disable=SC1090
    source "$pullf"
    set +a
    rm -f "$pullf"
  fi
fi
[[ -n "${CRON_SECRET:-}" ]] || { echo "CRON_SECRET required"; exit 1; }
export BACKFILL_URL="${BACKFILL_URL:-https://ipbl-minimal-viewer.vercel.app}"
echo "=== March 2026 ==="
node scripts/backfill-results.mjs --year 2026 --month 3 --all
echo "=== April 2026 ==="
node scripts/backfill-results.mjs --year 2026 --month 4 --all