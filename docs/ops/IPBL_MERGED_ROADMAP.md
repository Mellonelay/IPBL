# IPBL Merged Roadmap State

This file records the current roadmap after the merged PR sequence through PR #27.

## Completed / production verified

```text
Execution Fabric foundation
Results foundation
Live foundation
Recorder baseline
C8/C8.5 operational hardening
C9 proof/reconciliation foundation
Approved 13-division boundary
H2H freshness and continuity
```

## Current approved divisions

Men:

```text
ipbl-66-m-pro-a
ipbl-66-m-pro-b
ipbl-66-m-pro-c
ipbl-66-m-pro-d
ipbl-66-m-pro-u
ipbl-66-m-pro-z
```

Women:

```text
ipbl-66-w-pro-a
ipbl-66-w-pro-b
ipbl-66-w-pro-c
ipbl-66-w-pro-d
ipbl-66-w-pro-g
ipbl-66-w-pro-k
```

Total: 13 approved divisions.

## Partial / active

```text
Official source revival
C9 EventsStat / 1xBet intelligence implementation
Team Statistics reconciliation
Operator Engine formalization
Graphify integration into active change planning
```

## Knowledge exists / under-integrated

```text
Graphify knowledge layer
COMMUNITY docs
Swarm coordination
Betting Memory
```

## Planned

```text
GEN
Backtesting
```

## Next roadmap phase

```text
Team Statistics reconciliation
```

Reason: H2H now merges Results KV, official online rows, and recent official daily calendar windows. Team Statistics must be reconciled against that same 13-division source model before deeper odds/operator features.

## Git History Map

`origin/main` currently has 255 commits and 61 closed PRs. That is not accidental churn; it is a record of the repo being built in narrow, verifiable slices while the live production contract kept moving.

### Why the history is long

- The app grew from a viewer into a live data system with recorder, replay, H2H, team stats, prediction, and operator layers.
- Each production fix had to be isolated because the live feed and Vercel runtime were changing underneath it.
- Merge commits preserved phase boundaries, so the branch history mirrors the roadmap instead of flattening it into one rewrite.

### History phases

```text
PR 1-14  - base app hardening, cron/security, results contracts, CI and Vercel normalization
PR 15-29 - results/H2H/team-stat reconciliation, live source registry, recorder foundation
PR 30-38 - server import fixes, deployment cleanup, phase-closure packaging
PR 39-49 - live source failover, bookmaker mirror handling, recorder vs fresh-live precedence
PR 50-61 - prediction/runtime layers, operator playbook, harness cleanup, live compatibility polish
```

### Rebuild rules learned from the history

- Freeze the data contract before changing the UI.
- Do not reintroduce route self-fetching when a shared feed builder exists.
- Keep recorder fallback, official source, and bookmaker source precedence explicit.
- Treat compatibility endpoints as wrappers around shared server logic, not separate source paths.
- Prefer narrow commits and tests that prove the contract that just changed.

### What this means for the rebuild

The next rebuild should reduce PR count by reducing repeated plumbing, not by skipping verification. The right target is fewer contract surfaces with clearer ownership, not fewer checks.
