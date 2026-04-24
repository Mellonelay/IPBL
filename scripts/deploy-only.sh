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
  echo "VERCEL_TOKEN is required"
  exit 1
fi

npm run build
./node_modules/.bin/vercel deploy --prod --yes --token "$VERCEL_TOKEN"