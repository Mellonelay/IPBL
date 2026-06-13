# Vercel Execution Fabric Workflow Profile

This profile converts the audited Vercel command surface into the IPBL release workflow. It is project policy for ChatGPT/Execution Fabric operator work on the IPBL viewer.

## Doctrine

```text
Preview deploy is routine after tests.
Production deploy is gated.
Production domain promotion is a separate gate.
Route mutation is a separate gate.
Secret-bearing commands must never print values.
```

## Command classification

| Class | Commands / actions | Policy |
|---|---|---|
| Discovery | `vercel project ls`, `vercel activity ls`, `vercel list`, `vercel inspect`, `vercel logs --limit`, `vercel routes list`, `npx skills list`, `npx skills find` | Allowed read-only. Tie evidence to project, branch, and SHA. |
| Local verification | `npm ci`, `npm run build`, `vercel build`, `vercel build --debug`, `vercel dev` | Allowed in canonical repo/worktree. Redact logs when env/secrets can appear. |
| Preview deployment | `vercel pull --yes --environment=preview`, `vercel build`, `vercel deploy --prebuilt` | Allowed after local gates and canonical project/link verification. Capture URL, inspect, smoke, logs. |
| Production staged deployment | `vercel pull --yes --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod --skip-domain` | Production-gated. Creates a staged production deployment without domain cutover. |
| Production promotion | `vercel promote <deployment>` | Separate gated action after staged smoke/E2E/log inspection. |
| Rollback | `vercel rollback <deployment>` | Emergency or approved rollback only; verify rollback target first. |
| Route mutation | `vercel routes add --ai`, `vercel routes publish` | Do not run unattended. Traffic-changing mutation requires explicit routing gate. |
| REST deployment API | `POST /v1/deployments` with token | Do not use unless explicitly part of approved CI. Never expose token. |
| Global skills mutation | `npx skills add ... -g`, `npx skills update`, `npx skills remove` | Avoid by default. Requires scope and changelog evidence. |

## Preview release flow

```text
1. identify workload and canonical repo
2. verify branch/commit SHA
3. verify Vercel project linkage
4. inspect package manager, lockfile, framework, root, build output
5. pull preview env if required without printing secrets
6. install dependencies reproducibly
7. run tests/lint/typecheck/build
8. vercel build
9. verify .vercel/output
10. vercel deploy --prebuilt
11. capture deployment URL and deployment ID
12. vercel inspect <url>
13. smoke test deployment URL
14. vercel logs <url> --limit 50 with redaction
15. record runtime audit and artifact SHA
```

## Production staged release flow

```text
1. confirm production release authorization and release SHA
2. verify canonical repository and production branch/release branch
3. pull production env without printing secrets
4. run full local/CI gates
5. vercel build --prod
6. verify .vercel/output
7. vercel deploy --prebuilt --prod --skip-domain
8. capture staged production deployment URL/ID
9. vercel inspect <deployment>
10. smoke/E2E staged deployment URL
11. vercel logs <deployment> --limit 50 with redaction
12. verify no secret leakage
13. vercel promote <deployment>
14. verify custom domain points to promoted deployment
15. record promotion evidence, runtime audit, and SHA
```

## Commands not to run casually

```text
vercel --prod
vercel deploy --prebuilt --prod
vercel promote ...
vercel rollback ...
vercel routes add --ai ...
vercel routes publish
npx skills add ... -g
REST deployment API calls
git push origin main
```

## Required evidence fields

Capture when available:

```text
VERCEL_ENV
VERCEL_TARGET_ENV
VERCEL_URL
VERCEL_BRANCH_URL
VERCEL_PROJECT_PRODUCTION_URL
VERCEL_REGION
VERCEL_DEPLOYMENT_ID
VERCEL_PROJECT_ID
VERCEL_GIT_PROVIDER
VERCEL_GIT_REPO_SLUG
VERCEL_GIT_REPO_OWNER
VERCEL_GIT_COMMIT_REF
VERCEL_GIT_COMMIT_SHA
VERCEL_GIT_PULL_REQUEST_ID
```

Never print:

```text
VERCEL_AUTOMATION_BYPASS_SECRET
VERCEL_OIDC_TOKEN
VERCEL_TOKEN
NPM_TOKEN
NPM_RC contents
.env values
```

## Repository-dispatch rule

Prefer post-deployment E2E on:

```yaml
repository_dispatch:
  types:
    - vercel.deployment.success
```

Use the deployment URL from:

```text
github.event.client_payload.url
```

## Deployment URL evidence rule

Do not rely on `vercel list --limit 1 --json` alone. Match the deployment to:

```text
project
commit SHA
branch
PR number or release ID
deployment URL/ID
```

## Build configuration preflight

Before deployment, record:

```text
package manager
lockfile
framework preset
root directory
buildCommand
installCommand
outputDirectory
Node version
Vercel env pull scope
```
