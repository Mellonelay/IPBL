#!/usr/bin/env bash
set -euo pipefail

required=(git gh node npm vercel jq curl python3)
missing=0

for tool in "${required[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '[ok] %-10s %s\n' "$tool" "$(command -v "$tool")"
  else
    printf '[missing] %s\n' "$tool"
    missing=1
  fi
done

echo
echo "GitHub authentication:"
if gh auth status; then
  echo "[ok] GitHub CLI authenticated"
else
  echo "[warn] GitHub CLI is not authenticated"
fi

echo
echo "Vercel authentication:"
if vercel whoami; then
  echo "[ok] Vercel CLI authenticated"
else
  echo "[warn] Vercel CLI is not authenticated"
fi

echo
git --version || true
node --version || true
npm --version || true
vercel --version || true
jq --version || true
python3 --version || true

exit "$missing"
