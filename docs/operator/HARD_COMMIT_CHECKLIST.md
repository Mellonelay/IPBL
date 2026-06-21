# Hard-Commit Checklist

Store operator policy, scripts, and runbooks in Git. Do not commit credentials.

## One-time setup

Copy these files into the Worker or operator repository:

```text
docs/operator/MELLONELAY_CUSTOM_INSTRUCTIONS.md
docs/operator/VM_GITHUB_VERCEL_RUNBOOK.md
ops/bootstrap/verify-tools.sh
```

Then run:

```bash
cd /root/execution-fabric-worker

mkdir -p docs/operator ops/bootstrap

cp /path/to/MELLONELAY_CUSTOM_INSTRUCTIONS.md   docs/operator/MELLONELAY_CUSTOM_INSTRUCTIONS.md

cp /path/to/VM_GITHUB_VERCEL_RUNBOOK.md   docs/operator/VM_GITHUB_VERCEL_RUNBOOK.md

cp /path/to/verify-tools.sh   ops/bootstrap/verify-tools.sh

chmod 0755 ops/bootstrap/verify-tools.sh

git status --short
git diff --check
git diff -- docs/operator ops/bootstrap

git switch -c ops/operator-contract-v2
git add   docs/operator/MELLONELAY_CUSTOM_INSTRUCTIONS.md   docs/operator/VM_GITHUB_VERCEL_RUNBOOK.md   ops/bootstrap/verify-tools.sh

git diff --cached --check
git diff --cached

git commit -m "ops: codify GitHub and Vercel operator contract"
git push -u origin ops/operator-contract-v2

gh pr create   --title "ops: codify GitHub and Vercel operator contract"   --body "Adds bounded GPT operator instructions, VM verification, and GitHub/Vercel runbooks. No credentials are included."

gh pr checks --watch
```

## Before merging

Verify:

```bash
bash ops/bootstrap/verify-tools.sh
git grep -nEI 'ghp_|github_pat_|vercel.*token|api[_-]?key|private[_-]?key|password'
git status --short
```

Review any matches manually. Do not merge secret values.

## What a hard commit does and does not do

A Git commit permanently versions:

- policies
- runbooks
- verification scripts
- allowed command patterns
- repository-specific operating rules

A Git commit does not:

- authenticate GitHub CLI
- authenticate Vercel CLI
- grant cloud permissions
- install system packages
- provide unrestricted root authorization

Those capabilities must be configured securely on the VM and verified separately.
