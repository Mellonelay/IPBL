# IPBL Release Checklist

Use this checklist for every release candidate in this repo.

## 1. Confirm scope

- Verify the branch, commit SHA, and target Vercel project.
- Confirm the change only touches the intended live-feed, recorder, or UI paths.
- Check `git status --short --branch` before and after edits.

## 2. Run local gates

- `npm run test:bookmaker-live`
- `npm run test:live-reconciliation`
- `npm run test:ipbl-compat`
- `npm run test:phase-c8-contracts`
- `npm run test:recorder`
- `npm run build`
- `npm run ops:vercel-preflight`

## 3. Verify live-source behavior

- Call `/api/results/live` and confirm the response is `200`.
- Confirm `status.status` is `OK` or `PARTIAL` only when fallback is expected.
- Confirm the live card set matches the approved division registry.
- Confirm `bookmakerSourceFailures` and `unmatchedBookmakerEvents` are empty or explicitly explained.

## 4. Verify recorder health

- Call `/api/recorder?mode=health`.
- Confirm the returned health object matches the latest recorder state.
- Confirm freshness, scheduler cadence, and fallback indicators are sensible.
- If the cron path is exercised, confirm `/api/cron/record-live` returns `health`, `mirrorProbe`, and the recorded run summary.

## 5. Inspect Vercel

- `vercel whoami`
- `vercel project ls`
- `vercel inspect <deployment-or-url>`
- `vercel logs <deployment-or-url> --limit 50`

## 6. Deploy

- Deploy a preview first.
- Smoke-test the preview URL before production promotion.
- Promote only after logs and health are clean.
- Do not use route mutation or rollback without an explicit release decision.

