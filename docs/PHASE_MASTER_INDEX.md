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

## Phase 9: Fully Complete

- Phase 9 - Runtime Agent Graph:
  - Runtime graph materialization for agents, workflows, jobs, artifacts, audits, and recovery actions
  - Canonical repository-derived snapshot at [artifacts/runtime-agent-graph/runtime-agent-graph.json](/root/repos/IPBL/artifacts/runtime-agent-graph/runtime-agent-graph.json)
  - Deterministic graph builder with read-only event normalization
  - Dedicated contract test at [tests/runtime-agent-graph.test.ts](/root/repos/IPBL/tests/runtime-agent-graph.test.ts)
  - Implementation module at [lib/server/runtime-agent-graph.ts](/root/repos/IPBL/lib/server/runtime-agent-graph.ts)

## Phase 10: Fully Complete

- Phase 10 - IPBL Workload Graph:
  - Read-only workload graph index for Live Source, Official Source, Bookmaker Source, Results, Team Statistics, H2H, Recorder, Release, Evidence, and Operator Intelligence
  - Dedicated contract test at [tests/workload-graph.test.ts](/root/repos/IPBL/tests/workload-graph.test.ts)
  - Implementation module at [lib/server/workload-graph.ts](/root/repos/IPBL/lib/server/workload-graph.ts)
  - Durable manifest at [artifacts/workload-graph/ipbl-workload-graph.json](/root/repos/IPBL/artifacts/workload-graph/ipbl-workload-graph.json)

## Validation Entry Points

- [scripts/validate-phase-4-5.sh](/root/repos/IPBL/scripts/validate-phase-4-5.sh)
- [scripts/validate-phase-6-7.sh](/root/repos/IPBL/scripts/validate-phase-6-7.sh)
- [scripts/validate-phase-10-11.sh](/root/repos/IPBL/scripts/validate-phase-10-11.sh)
- [package.json](/root/repos/IPBL/package.json)

Recommended commands:

```bash
npm run validate:phase-master
npm run validate:phase-6-7
npm run validate:phase-10-11
npx agnix@0.32.0 .
bash scripts/validate-phase-4-5.sh
npm run test:approved-divisions
npm run test:team-statistics-reconciliation
```

## Scope Boundaries

- This index does not reclassify Phase 4-5 as complete.
- This index does not add runtime behavior.
- This index only points to evidence that already exists in the repo.
