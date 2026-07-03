# IPBL A-Team Runtime Verified Baseline

## Verified date/time
- Verified UTC: 2026-06-27T19:21:28Z
- Verification path: `vmRouter` live runtime through the deployed Worker

## Architecture
- IPBL keeps the A-Team contract in the repository.
- `createAgent` is logical-only and does not perform runtime execution.
- `vmRouter` executes the work through the VM job ledger.
- The A-Team smoke uses the clean worktree at `/root/repos/IPBL-worktrees/agenteam-fabric-runtime-v1`.
- Runtime evidence is stored under `/root/runtime-audits/agenteam`.
- The dirty main checkout in `/root/repos/IPBL` remains unresolved and was not blindly cleaned.

## Runtime evidence
- VM surface health check passed.
- `vmRouter` `action=wait` worked on live jobs.
- A-Team smoke executed through `vmRouter` only.
- The smoke job completed successfully with terminal VM evidence.

## VM job evidence
- Job ID: `73d33306-0bd2-4ad5-9f31-c301078c3114`
- Terminal state: `completed`
- Return code: `0`
- Stdout: orchestrator completed successfully
- Stderr: empty
- Summary artifact: `/root/runtime-audits/agenteam/smoke-agenteam-runtime-v1/orchestrator/20260627T192127Z-c3907720/summary.json`

## Role order
The verified execution order was:

Researcher → PM → Architect → Dev → QA → Reviewer

All roles completed successfully.

## QA/Reviewer gates
- QA gate passed.
- Reviewer gate passed.
- No release action occurred during the smoke run.

## Artifact paths
- Artifact root: `/root/runtime-audits/agenteam`
- Latest run: `/root/runtime-audits/agenteam/smoke-agenteam-runtime-v1`
- Orchestration summary: `/root/runtime-audits/agenteam/smoke-agenteam-runtime-v1/orchestrator/20260627T192127Z-c3907720/summary.json`
- Role result artifacts: `/root/runtime-audits/agenteam/smoke-agenteam-runtime-v1/<role>/<run>/result.json`

## What this proves
- The IPBL repository keeps the A-Team contract and role ordering.
- The VM boundary is the real execution path for A-Team work.
- `createAgent` is logical-only and not a substitute for runtime execution.
- The A-Team smoke can run end to end through `vmRouter`.
- The role pipeline can reach terminal success with QA and Reviewer gates passing.
- Runtime audits are the evidence source for this baseline.

## What this does not prove
- It does not prove the dirty main checkout in `/root/repos/IPBL` is clean.
- It does not prove merge, push, or deployment occurred during the smoke.
- It does not prove production data changed.
- It does not prove anything beyond the specific smoke task and captured artifacts.

## Caveats
- The main IPBL checkout is still dirty and should not be cleaned blindly.
- This baseline is evidence of one successful runtime path, not a blanket proof for all tasks.
- The smoke ran in the dedicated clean worktree, not in the dirty main checkout.

## Next recommended steps
1. Keep the clean smoke worktree available for future A-Team runtime checks.
2. Use `/root/runtime-audits/agenteam` as the evidence source for follow-up reviews.
3. Re-verify the VM surface if the Worker or VM executor is redeployed.
4. Resolve the dirty main checkout only with explicit scope and tracked-file review.
5. Avoid claiming push, deploy, merge, or phase closure without fresh runtime evidence.
