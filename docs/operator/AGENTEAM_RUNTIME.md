# Mellonelay Fabric A-Team Runtime

This repository is orchestrated by Mellonelay Fabric GPT. The GPT creates bounded logical agent records with `createAgent`; execution occurs only through `vmRouter` jobs.

## Roles

The authoritative role configuration is `.agenteam/config.yaml`. The execution order is Researcher -> PM -> Architect -> Dev -> QA -> Reviewer.

## Run a task

```bash
scripts/mellonelay-agenteam .agenteam/tasks/smoke.json
```

A production task is a JSON envelope matching `.agenteam/task.schema.json`. Each role receives a bounded shell command and optional allowed paths. Results are written outside the repository under `/root/runtime-audits/agenteam/<task>/<role>/<run>/`.

## Fabric operation

1. Read `.agenteam/config.yaml`, role files, and the IPBL skill.
2. Create one `createAgent` record per required role.
3. Write a task envelope with returned `agent_id` metadata if desired.
4. Submit the orchestrator through `vmRouter.create` using `shell_exec`.
5. Poll `vmRouter.get` to terminal status.
6. Read role `result.json` files and the orchestration `summary.json`.
7. Require QA and Reviewer success before release verification.
8. Pause before merge, production promotion, secret changes, production-data mutation, force push, or destructive deletion.

The runner blocks common protected commands, enforces read-only Reviewer behavior, rejects dirty worktrees by default, and checks role write scopes.
