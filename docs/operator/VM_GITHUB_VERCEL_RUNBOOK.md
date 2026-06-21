# VM Bootstrap and Operator Runbook

This file belongs in the operator repository. It contains no credentials.

## Required VM tools

- git
- gh
- node
- npm
- vercel CLI
- jq
- curl
- python3

## Verification

Run:

```bash
git --version
gh --version
node --version
npm --version
vercel --version
jq --version
python3 --version
gh auth status
vercel whoami
```

Authentication must be completed directly on the VM using approved secure methods. Never paste tokens into chat or commit them.

## Recommended repository layout

```text
ops/
  bootstrap/
    verify-tools.sh
  runbooks/
    github-vercel-operator.md
  policies/
    allowed-operations.md
```

## Safe Git workflow

```bash
git status --short --branch
git fetch --all --prune
git switch -c ops/<task-name>
# edit files
git diff --check
git status --short
git diff --stat
# run repository-specific tests
git add <explicit-paths>
git diff --cached --check
git diff --cached
git commit -m "ops: <clear description>"
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch
```

Avoid `git add .` for sensitive repositories. Add explicit paths.

## Safe Vercel workflow

```bash
vercel whoami
vercel project ls
vercel inspect <deployment-or-url>
vercel logs <deployment-or-url>
vercel --prebuilt
```

Use preview deployments by default. Promote or deploy to production only through the approved release path.

## Secret handling

Never commit:

```text
.env
.env.*
*.pem
*.key
credentials.json
service-account*.json
.vercel/.env*
```

Keep `.vercel/project.json` only when the repository policy allows it; it contains project linkage but should still be reviewed before commit.

## Pre-commit secret scan

Use available repository tooling. At minimum:

```bash
git diff --cached --name-only
git diff --cached | grep -Ein 'token|secret|password|api[_-]?key|private[_-]?key' && {
  echo "Potential secret detected; review required."
  exit 1
} || true
```

A dedicated scanner such as `gitleaks` is preferred when installed.

## VM execution through Execution Fabric

Submit bounded commands through `vmRouter.create`, then poll with `vmRouter.get` until terminal.

Do not bypass the job ledger for GPT-triggered runtime work.
