#!/usr/bin/env bash
# Deploy to Vercel production. Loads VERCEL_TOKEN from .env.local (gitignored).
set -euo pipefail
cd "$(dirname "$0")"
set -a
[[ -f .env.local ]] && . ./.env.local
set +a
npm run build
exec ./node_modules/.bin/vercel deploy --prod --yes --token "${VERCEL_TOKEN:?Missing VERCEL_TOKEN — add it to .env.local}"