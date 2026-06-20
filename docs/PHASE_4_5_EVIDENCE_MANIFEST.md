# Phase 4-5 Evidence Manifest

Source of truth:
- [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)
- [artifacts/graphify/phase-roadmap.json](/root/repos/IPBL/artifacts/graphify/phase-roadmap.json)
- [docs/CURRENT_PROJECT_SYNC_20260615.md](/root/repos/IPBL/docs/CURRENT_PROJECT_SYNC_20260615.md)

This manifest is read-only. It maps existing repo evidence to the canonical Phase 4 and Phase 5 roadmap checkpoints without changing runtime behavior.

## Phase 4 - Source Archaeology Graph

### Status

- Fully complete / materialized in the roadmap.
- Source coverage and production proof are aggregated into a canonical source-proof bundle.

### Canonical checkpoint

- [artifacts/source-archaeology/source-archaeology-graph.json](/root/repos/IPBL/artifacts/source-archaeology/source-archaeology-graph.json)

### Validation entrypoint

- [scripts/validate-phase-4-5.sh](/root/repos/IPBL/scripts/validate-phase-4-5.sh)

### Existing evidence

- Source and fallback behavior:
  - [docs/LIVE_SOURCE_FAILOVER.md](/root/repos/IPBL/docs/LIVE_SOURCE_FAILOVER.md)
  - [docs/phase-c8/SOURCE_HEALTH_CONTRACT.md](/root/repos/IPBL/docs/phase-c8/SOURCE_HEALTH_CONTRACT.md)
- Source-health and bookmaker coverage artifacts:
  - [artifacts/phase-c8/source-health-contract.json](/root/repos/IPBL/artifacts/phase-c8/source-health-contract.json)
  - [artifacts/phase-c8/live-source-health-evaluation.json](/root/repos/IPBL/artifacts/phase-c8/live-source-health-evaluation.json)
  - [artifacts/phase-c8/live-source-health-evaluation-c8-5.json](/root/repos/IPBL/artifacts/phase-c8/live-source-health-evaluation-c8-5.json)
  - [artifacts/phase-c8/endpoint-source-registry.json](/root/repos/IPBL/artifacts/phase-c8/endpoint-source-registry.json)
  - [artifacts/phase-c8/graphify-impact-report.json](/root/repos/IPBL/artifacts/phase-c8/graphify-impact-report.json)
  - [artifacts/phase-c8/completion-report.json](/root/repos/IPBL/artifacts/phase-c8/completion-report.json)
- Phase C9 source proof and reconciliation artifacts:
  - [artifacts/phase-c9/c9-source-proof-summary.json](/root/repos/IPBL/artifacts/phase-c9/c9-source-proof-summary.json)
  - [artifacts/phase-c9/current-melbet-events.json](/root/repos/IPBL/artifacts/phase-c9/current-melbet-events.json)
  - [artifacts/phase-c9/history-graph-proof.json](/root/repos/IPBL/artifacts/phase-c9/history-graph-proof.json)
  - [artifacts/phase-c9/history-graph-schema-summary.json](/root/repos/IPBL/artifacts/phase-c9/history-graph-schema-summary.json)
  - [artifacts/phase-c9/official-endpoint-shapes.json](/root/repos/IPBL/artifacts/phase-c9/official-endpoint-shapes.json)
  - [artifacts/phase-c9/pr23/official-source-results.json](/root/repos/IPBL/artifacts/phase-c9/pr23/official-source-results.json)
  - [artifacts/phase-c9/pr23/production-reconciliation-inputs.json](/root/repos/IPBL/artifacts/phase-c9/pr23/production-reconciliation-inputs.json)
  - [artifacts/phase-c9/pr23/reconciliation-summary.json](/root/repos/IPBL/artifacts/phase-c9/pr23/reconciliation-summary.json)
  - [artifacts/phase-c9/pr23/row-reconciliation-latest.json](/root/repos/IPBL/artifacts/phase-c9/pr23/row-reconciliation-latest.json)
  - [artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json](/root/repos/IPBL/artifacts/phase-c9/pr23/eventsstat-reprobe-latest.json)
- Tests that already prove source behavior:
  - [tests/ipbl-source/division-discovery.test.ts](/root/repos/IPBL/tests/ipbl-source/division-discovery.test.ts)
  - [tests/ipbl-source/variable-match-count.test.ts](/root/repos/IPBL/tests/ipbl-source/variable-match-count.test.ts)
  - [tests/ipbl-source/historical-coverage.test.ts](/root/repos/IPBL/tests/ipbl-source/historical-coverage.test.ts)
  - [tests/ipbl-source/live-source.test.ts](/root/repos/IPBL/tests/ipbl-source/live-source.test.ts)
  - [tests/ipbl-source/live-route-nested-score.test.ts](/root/repos/IPBL/tests/ipbl-source/live-route-nested-score.test.ts)
  - [tests/bookmaker-live.test.ts](/root/repos/IPBL/tests/bookmaker-live.test.ts)
  - [tests/source-health.test.ts](/root/repos/IPBL/tests/source-health.test.ts)
  - [tests/live-source-idle-semantics.test.mjs](/root/repos/IPBL/tests/live-source-idle-semantics.test.mjs)
  - [tests/live-feed-freshness.test.ts](/root/repos/IPBL/tests/live-feed-freshness.test.ts)
  - [tests/live-display-state.test.ts](/root/repos/IPBL/tests/live-display-state.test.ts)
  - [tests/frontend-api-query-contracts.test.mjs](/root/repos/IPBL/tests/frontend-api-query-contracts.test.mjs)
  - [tests/recorder-live-feed.test.ts](/root/repos/IPBL/tests/recorder-live-feed.test.ts)

### Remaining gap

- No runtime gap remains for Phase 4.
- Phase 5 remains partial until the evidence graph is normalized into a durable supersession-aware index.

## Phase 5 - Evidence Graph

### Status

- Partial.
- Evidence already exists, but it is not yet normalized into a durable supersession-aware evidence graph.

### Canonical checkpoint

- [artifacts/evidence/evidence-supersession-index.json](/root/repos/IPBL/artifacts/evidence/evidence-supersession-index.json)

### Validation entrypoint

- [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)

### Existing evidence

- Graphify and evidence substrate:
  - [graphify-out/graph.json](/root/repos/IPBL/graphify-out/graph.json)
  - [graphify-out/GRAPH_REPORT.md](/root/repos/IPBL/graphify-out/GRAPH_REPORT.md)
  - [graphify-out/obsidian/](/root/repos/IPBL/graphify-out/obsidian/)
  - [artifacts/graphify/god-node-ledger.json](/root/repos/IPBL/artifacts/graphify/god-node-ledger.json)
  - [artifacts/graphify/phase-roadmap.json](/root/repos/IPBL/artifacts/graphify/phase-roadmap.json)
- Evidence-heavy artifacts already present:
  - [artifacts/screenshots/live-proof.png](/root/repos/IPBL/artifacts/screenshots/live-proof.png)
  - [artifacts/phase-c/SHA256SUMS](/root/repos/IPBL/artifacts/phase-c/SHA256SUMS)
  - [artifacts/phase-c/completion-report.json](/root/repos/IPBL/artifacts/phase-c/completion-report.json)
  - [artifacts/phase-c/graphify-impact-report.json](/root/repos/IPBL/artifacts/phase-c/graphify-impact-report.json)
  - [artifacts/phase-c8/SHA256SUMS](/root/repos/IPBL/artifacts/phase-c8/SHA256SUMS)
  - [artifacts/phase-c8/completion-report.json](/root/repos/IPBL/artifacts/phase-c8/completion-report.json)
  - [artifacts/phase-c8/graphify-impact-report.json](/root/repos/IPBL/artifacts/phase-c8/graphify-impact-report.json)
  - [artifacts/phase-c9/SHA256SUMS](/root/repos/IPBL/artifacts/phase-c9/SHA256SUMS)
  - [artifacts/phase-c9/c9-plan-manifest.json](/root/repos/IPBL/artifacts/phase-c9/c9-plan-manifest.json)
  - [artifacts/phase-c9/pr23/SHA256SUMS](/root/repos/IPBL/artifacts/phase-c9/pr23/SHA256SUMS)
- Supporting tests:
  - [tests/results-hardening.test.ts](/root/repos/IPBL/tests/results-hardening.test.ts)
  - [tests/results-api-policy.test.ts](/root/repos/IPBL/tests/results-api-policy.test.ts)
  - [tests/results-sync-policy.test.ts](/root/repos/IPBL/tests/results-sync-policy.test.ts)
  - [tests/results-refresh-policy.test.ts](/root/repos/IPBL/tests/results-refresh-policy.test.ts)
  - [tests/results-state.test.ts](/root/repos/IPBL/tests/results-state.test.ts)
  - [tests/results-legacy-history.test.ts](/root/repos/IPBL/tests/results-legacy-history.test.ts)
  - [tests/results-writer.test.ts](/root/repos/IPBL/tests/results-writer.test.ts)
  - [tests/recorder-trigger.test.sh](/root/repos/IPBL/tests/recorder-trigger.test.sh)
  - [tests/recorder-monitor.test.sh](/root/repos/IPBL/tests/recorder-monitor.test.sh)
  - [tests/phase-c9-row-reconciliation.test.mjs](/root/repos/IPBL/tests/phase-c9-row-reconciliation.test.mjs)
  - [tests/phase-c9-active-matched-gate.test.mjs](/root/repos/IPBL/tests/phase-c9-active-matched-gate.test.mjs)
  - [tests/eventsstat-contracts.test.ts](/root/repos/IPBL/tests/eventsstat-contracts.test.ts)
  - [tests/ipbl-approved-divisions.test.mjs](/root/repos/IPBL/tests/ipbl-approved-divisions.test.mjs)

### Remaining gap

- The evidence graph is still distributed across multiple artifact families.
- There is no single manifest that declares:
  - what evidence supersedes what
  - which artifacts are canonical
  - which tests are the proof gates for each checkpoint
- Phase 5 therefore remains partial until the evidence is normalized into one durable index.

## Recommended follow-up

- Keep this manifest as the canonical Phase 4-5 readout.
- Use it as the source for a thin validation wrapper only if a future change needs a repeatable gate.
- Do not add runtime behavior to satisfy this manifest.
