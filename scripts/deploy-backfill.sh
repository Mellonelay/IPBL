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

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN is required (export or add to .env.local)"
  exit 1
fi

npm run build

JSON_OUT=$(./node_modules/.bin/vercel deploy --prod --yes --token "$VERCEL_TOKEN" --format json)
echo "$JSON_OUT"

DEPLOY_URL=$(echo "$JSON_OUT" | node -e '
  let s = "";
  process.stdin.on("data", (c) => (s += c));
  process.stdin.on("end", () => {
    try {
      const j = JSON.parse(s);
      const u = j.url || j.alias?.[0];
      if (u) console.log(u.startsWith("http") ? u : "https://" + u);
    } catch {
      process.exit(1);
    }
  });
')

if [[ -z "${DEPLOY_URL:-}" ]]; then
  echo "Could not parse deployment URL from vercel JSON"
  exit 1
fi

echo "Deployed: $DEPLOY_URL"

# Stable alias hits production KV/cron env (per-deployment URLs can differ in edge cases).
BACKFILL_BASE="${BACKFILL_URL:-https://ipbl-minimal-viewer.vercel.app}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET missing; add to .env.local then run:"
  echo "  BACKFILL_URL=$BACKFILL_BASE node scripts/backfill-results.mjs --year 2026 --month 3 --all"
  echo "  BACKFILL_URL=$BACKFILL_BASE node scripts/backfill-results.mjs --year 2026 --month 4 --all"
  exit 0
fi

for M in 3 4; do
  echo "Backfill 2026-$M ..."
  BACKFILL_URL="$BACKFILL_BASE" node scripts/backfill-results.mjs --year 2026 --month "$M" --all --url "$BACKFILL_BASE"
done

echo "Done."