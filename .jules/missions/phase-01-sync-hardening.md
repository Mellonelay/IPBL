# MISSION: PHASE 01 - SYNC HARDENING (Jules Autonomous Protocol)
## Context
The current betting sync is fragile and depends on session cookies that expire.

## Technical Tasks
1. Search `scripts/` for 1xbet history fetching logic.
2. Implement `scripts/lib/auth-validator.mjs` to perform a HEAD request or lightweight GET to verify the cookie before the main sync.
3. Update `scripts/sync-bet-history.mjs` to import this validator and fail early with a clear error code if the session is invalid.
4. Ensure no secrets (tokens/cookies) are printed to console logs.

## Verification & Handoff
1. Run `npm run build` to ensure no regressions.
2. Commit and push changes to `main`.
3. Deploy to Vercel production.
4. Verify the deployment status using your Vercel MCP tools.