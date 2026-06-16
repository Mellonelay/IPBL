# IPBL Phase Master Index

Source of truth:
- [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)
- [artifacts/graphify/phase-roadmap.json](/root/repos/IPBL/artifacts/graphify/phase-roadmap.json)
- [docs/ops/IPBL_MERGED_ROADMAP.md](/root/repos/IPBL/docs/ops/IPBL_MERGED_ROADMAP.md)
- [docs/PHASE_4_5_EVIDENCE_MANIFEST.md](/root/repos/IPBL/docs/PHASE_4_5_EVIDENCE_MANIFEST.md)

This index is the repo-wide navigation layer for the phases that are complete, materialized, or already supported by durable evidence.

## Phase 0-3: Complete or Materialized

### Phase 0 - Execution Fabric Baseline

- Status: complete
- Roadmap reference: [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md:419-423](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md#L419)
- Canonical ledger: [artifacts/graphify/phase-roadmap.json](/root/repos/IPBL/artifacts/graphify/phase-roadmap.json)
- Core evidence:
  - runtime audits in `/root/runtime-audits/`
  - Vercel and GitHub workflow support

### Phase 1 - Graphify Bootstrap

- Status: complete / materialized
- Roadmap reference: [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md:425-429](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md#L425)
- Core evidence:
  - [graphify-out/graph.json](/root/repos/IPBL/graphify-out/graph.json)
  - [graphify-out/GRAPH_REPORT.md](/root/repos/IPBL/graphify-out/GRAPH_REPORT.md)
  - [graphify-out/obsidian/](/root/repos/IPBL/graphify-out/obsidian/)
  - [graphify-out/.graphify_analysis.json](/root/repos/IPBL/graphify-out/.graphify_analysis.json)
  - [graphify-out/.graphify_ast.json](/root/repos/IPBL/graphify-out/.graphify_ast.json)

## Phase 2-3, 5, 6-7, 11: Validated Support-Ready Surfaces

These phases are backed by durable evidence and validation coverage, but they remain separate from the open roadmap phases.

- Phase 2 - Graphify Skill Installation:
  - [docs/PHASE_MASTER_CHECKLIST.md](/root/repos/IPBL/docs/PHASE_MASTER_CHECKLIST.md)
- Phase 3 - Repo Archaeology / Code Review Graph:
  - [docs/PHASE_MASTER_CHECKLIST.md](/root/repos/IPBL/docs/PHASE_MASTER_CHECKLIST.md)
- Phase 5 - Evidence Graph:
  - [docs/PHASE_4_5_EVIDENCE_MANIFEST.md](/root/repos/IPBL/docs/PHASE_4_5_EVIDENCE_MANIFEST.md)
- Phase 6 - Skill Forge Materialization:
  - [docs/PHASE_6_7_EVIDENCE_MANIFEST.md](/root/repos/IPBL/docs/PHASE_6_7_EVIDENCE_MANIFEST.md)
- Phase 7 - agnix Integration:
  - [docs/PHASE_6_7_EVIDENCE_MANIFEST.md](/root/repos/IPBL/docs/PHASE_6_7_EVIDENCE_MANIFEST.md)
- Phase 11 - C9 Intelligence:
  - [docs/PHASE_10_11_EVIDENCE_MANIFEST.md](/root/repos/IPBL/docs/PHASE_10_11_EVIDENCE_MANIFEST.md)

## Phase 8: Fully Complete

- Phase 8 - Quarter-State Recorder:
  - Deterministic quarter-state snapshot scaffold
  - Read-only normalization over live recorder snapshots
  - Agnix-clean isolated worktree verification

## Phase 4: Fully Complete

- Phase 4 - Source Archaeology Graph:
  - [artifacts/source-archaeology/source-archaeology-graph.json](/root/repos/IPBL/artifacts/source-archaeology/source-archaeology-graph.json)
  - Canonical source-proof bundle for official source, bookmaker source, raw responses, parser candidates, fixtures, validations, and production proof
  - Read-only aggregation only; no runtime behavior change

## Phase 9: Fully Complete

- Phase 9 - Runtime Agent Graph:
  - Runtime graph materialization for agents, workflows, jobs, artifacts, audits, and recovery actions
  - Canonical repository-derived snapshot at [artifacts/runtime-agent-graph/runtime-agent-graph.json](/root/repos/IPBL/artifacts/runtime-agent-graph/runtime-agent-graph.json)
  - Deterministic graph builder with read-only event normalization
  - Dedicated contract test at [tests/runtime-agent-graph.test.ts](/root/repos/IPBL/tests/runtime-agent-graph.test.ts)
  - Implementation module at [lib/server/runtime-agent-graph.ts](/root/repos/IPBL/lib/server/runtime-agent-graph.ts)

## Phase 10: Fully Complete

- Phase 10 - IPBL Workload Graph:
  - Canonical read-only workload graph snapshot at [artifacts/workload-graph/ipbl-workload-graph.json](/root/repos/IPBL/artifacts/workload-graph/ipbl-workload-graph.json)
  - Repository-derived workload index over live source, official source, bookmaker source, results, team statistics, H2H, recorder, release, evidence, and operator intelligence surfaces
  - Dedicated contract test at [tests/ipbl-workload-graph.test.ts](/root/repos/IPBL/tests/ipbl-workload-graph.test.ts)
  - Implementation module at [lib/server/ipbl-workload-graph.ts](/root/repos/IPBL/lib/server/ipbl-workload-graph.ts)
  - Phase validator hook in [scripts/validate-phase-10-11.sh](/root/repos/IPBL/scripts/validate-phase-10-11.sh)

## Phase 12: Fully Complete

- Phase 12 - GEN / Operator Intelligence:
  - Canonical read-only operator intelligence report at [artifacts/operator-intelligence/operator-intelligence.json](/root/repos/IPBL/artifacts/operator-intelligence/operator-intelligence.json)
  - Repository-backed evidence for recorder, H2H, odds, rule versions, data quality, and backtest metrics
  - Dedicated contract test at [tests/operator-intelligence.test.ts](/root/repos/IPBL/tests/operator-intelligence.test.ts)
  - Implementation module at [lib/server/operator-intelligence.ts](/root/repos/IPBL/lib/server/operator-intelligence.ts)
  - Phase validator hook in [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)

## Phase 13: Fully Complete

- Phase 13 - Visualization:
  - Canonical read-only visualization catalog at [artifacts/visualization/visualization-catalog.json](/root/repos/IPBL/artifacts/visualization/visualization-catalog.json)
  - Repository-backed exports for Graphify, Obsidian, and code-review graph surfaces
  - Dedicated contract test at [tests/visualization-catalog.test.ts](/root/repos/IPBL/tests/visualization-catalog.test.ts)
  - Implementation module at [lib/server/visualization-catalog.ts](/root/repos/IPBL/lib/server/visualization-catalog.ts)
  - Phase validator hook in [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)

## Validation Entry Points

- [scripts/validate-phase-4-5.sh](/root/repos/IPBL/scripts/validate-phase-4-5.sh)
- [scripts/validate-phase-6-7.sh](/root/repos/IPBL/scripts/validate-phase-6-7.sh)
- [scripts/validate-phase-10-11.sh](/root/repos/IPBL/scripts/validate-phase-10-11.sh)
- [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)
- [package.json](/root/repos/IPBL/package.json)

Recommended commands:

```bash
npm run validate:phase-master
npm run validate:phase-6-7
npm run validate:phase-10-11
npm run test:operator-intelligence
npm run test:visualization-catalog
npx agnix@0.32.0 .
bash scripts/validate-phase-4-5.sh
npm run test:approved-divisions
npm run test:team-statistics-reconciliation
```

## Scope Boundaries

- This index does not reclassify Phase 5 as complete.
- This index does not add runtime behavior.
- This index only points to evidence that already exists in the repo.
