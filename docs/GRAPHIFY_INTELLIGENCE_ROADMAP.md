# Graphify Intelligence Roadmap

Version: 2.0  
Status: canonical repo artifact updated from Execution Fabric audit context on 2026-06-15  
Scope: Graphify, Skill Forge, agnix, Execution Fabric, IPBL, C9, GEN/operator intelligence, backend analysis engine

## Correction

The center of this system is not the Vercel app by itself.

The correct architecture is:

```text
Execution Fabric OS
  -> Graphify intelligence layer
  -> persistent graph / God Nodes
  -> Skill Forge materialization
  -> agnix configuration validation
  -> VM agents / workflows
  -> IPBL production workload
  -> Vercel / GitHub / runtime audits
  -> future GEN/operator intelligence
```

IPBL is the active production workload. Graphify is the reasoning substrate.

## Core Doctrine

```text
Thin Harness
Fat Skills
Persistent Graph
```

Meaning:

- Execution Fabric stays small and provides controlled runtime primitives.
- Graphify holds discovery, source archaeology, community detection, God Nodes, evidence, and impact reasoning.
- Skill Forge turns graph knowledge into reusable procedures.
- agnix validates agent configuration before runtime.
- Runtime audits prove what actually happened.

## Confirmed Materialized Assets

Local repo assets:

```text
graphify-out/graph.json
graphify-out/GRAPH_REPORT.md
graphify-out/graph.html
graphify-out/obsidian/
graphify-out/.graphify_analysis.json
graphify-out/.graphify_ast.json
.code-review-graph/graph.db
```

Runtime audit assets:

```text
/root/runtime-audits/ipbl-graphify-production-chain-20260610T203458Z/
/root/runtime-audits/ipbl-stages4-6-7-9-complete-20260610T184732Z/
/root/runtime-audits/graphify-architecture-roadmap-reanchor-20260614T074047Z/
/root/runtime-audits/graphify-phase-roadmap-recovery-20260614T074735Z/
/root/runtime-audits/roadmap-operating-model-update-20260613T094228Z/
```

The Graphify analysis includes community and high-level aggregation fields:

```text
communities
cohesion
gods
surprises
questions
```

That confirms the God Node / community layer is already part of the materialized graph output.

## Layer Model

### Layer 1 - Graphify Intelligence

Graphify is the truth discovery and reasoning layer.

Inputs:

- repositories
- source dumps
- API responses
- bookmaker pages and payloads
- logs
- screenshots
- runtime audits
- docs and handoffs

Outputs:

- knowledge graph
- source graph
- evidence graph
- impact graph
- skill graph
- execution graph
- community map
- God Node candidates

Graphify is not the production database and does not replace deterministic runtime services.

### Layer 2 - Skill Forge

Skill Forge materializes graph knowledge into reusable workflows:

```text
Graph evidence
  -> scoped procedure
  -> SKILL.md
  -> validation contract
  -> install plan
  -> runtime workflow
```

Required skill families:

- Graphify Repo Archaeology Skill
- Graphify Source Archaeology Skill
- IPBL Live Source Repair Skill
- IPBL Vercel Verification Skill
- Chrome/CDP Production Proof Skill
- Evidence Graph Finalization Skill
- GEN Layer Planning Skill

Closure workflow names mirrored in the repo-local agent skills:

- `graphify-source-archaeology`
- `live-source-repair`
- `vercel-verification`
- `evidence-finalization`
- `gen-planning`

### Layer 3 - agnix Configuration Validation

agnix is the static configuration integrity layer.

It validates:

- `SKILL.md`
- `AGENTS.md`
- agent config
- hooks
- MCP config
- multi-tool compatibility rules

It does not validate live basketball logic, production runtime behavior, or Graphify reasoning.

Use it as:

```text
Graphify -> Skill Forge -> agnix -> Execution Fabric
```

Local command shape:

```bash
npx agnix@0.32.0 --dry-run --show-fixes --target claude-code .codex .claude .agents
npx agnix@0.32.0 --fix-safe --target claude-code .codex .claude .agents
```

Do not use unsupported `--include`. Pass paths directly.

### Layer 4 - Execution Fabric

Execution Fabric is the runtime OS:

- VM executor
- runtime audits
- `graphRouter`
- `repoRouter`
- `skillRouter`
- `opsRouter`
- `vmRouter`
- GitHub PR/merge workflows
- Vercel deployment verification
- Chrome/CDP browser proof

Execution Fabric executes graph-informed procedures; it does not replace Graphify.

### Layer 5 - IPBL Production Workload

IPBL is a Vercel-hosted live basketball operator console.

Core subsystems:

- live cards
- Results history
- H2H drawer
- Team Statistics
- recorder and cron health
- official IPBL source
- bookmaker / 1xbet / Melbet fallback
- C9 reconciliation
- betting record and memory
- future operator intelligence

Current approved live division boundary is 14 divisions:

- Men: A, B, C, D, L, U, X, Z
- Women: A, B, C, D, G, K

Historical Results may include additional legacy divisions such as Men G. Do not collapse historical server registry and current live registry into one concept.

Recorder alignment checkpoint from 2026-06-15:

- `/api/results/live` fanout, canonical live division registry, and recorder approved tags are aligned at 13 live divisions.
- `tests/ipbl-approved-divisions.test.mjs` now asserts recorder approved tags match the canonical registry.
- `npm run test:recorder` verifies the recorder snapshot and trigger security path.
- This protects quarter-state evidence capture from silently dropping approved divisions such as Pro Men Z or Pro Men L.

Live freshness checkpoint from 2026-06-15:

- Production API probes showed `/api/results/live` was not CDN-stale (`age: 0`, `x-vercel-cache: MISS`) while the user still observed slow page updates.
- Root causes identified in code:
  - official live rows could fully suppress fresher bookmaker rows whenever official returned any live row.
  - Live tab cards rendered the `game` snapshot embedded inside older insight metadata until slower detail/box-score calls completed.
- Local repair:
  - official and bookmaker live sources are merged by verified matchup freshness.
  - `/api/results/live` emits explicit `no-store` headers.
  - Live tab requests use `cache: "no-store"` with a timestamp query.
  - Live tab polling is reduced to 5 seconds.
  - card display uses the fresh `liveGames` snapshot while preserving existing insight metadata.
- Regression coverage:
  - `tests/live-feed-freshness.test.ts`
  - `tests/live-display-state.test.ts`

### Layer 6 - GEN / Operator Intelligence

GEN is planned and seeded, not complete.

Seeded concepts visible in graph/operator artifacts include:

- `operator_engine_analyzequarterflow`
- `operator_engine_evaluateoperatordecision`
- `operator_engine_gethistoricalcontext`
- `operator_engine_getscoreboardanalysis`
- `operator_engine_parseh2hquartermatrix`
- `operator_engine_oddsband`
- `operator_mock_buildinsight`

GEN must be graph-grounded:

```text
Source graph
  -> evidence graph
  -> H2H / quarter / odds / team-form graph
  -> deterministic operator engine
  -> backtest evidence
  -> structured recommendation
```

No GEN recommendation is valid without data-quality state, evidence references, and backtest context.

## God Node Model

God Nodes are top-level synthetic anchors that make the graph reasoned rather than a loose file dump.

Hierarchy:

```text
GodNode
  -> DomainNode
  -> SubsystemNode
  -> ComponentNode
  -> ArtifactNode
```

Canonical God Nodes:

- Execution Fabric
- Graphify
- Skill Forge
- agnix
- Repo Archaeology
- Source Archaeology
- Code Review Graph
- IPBL
- C9 Intelligence
- GEN / Operator Intelligence
- Vercel Release
- Runtime Audits

Machine-readable ledger:

```text
artifacts/graphify/god-node-ledger.json
```

## Graph Types

### Knowledge Graph

Facts, concepts, entities, relationships, subsystems.

### Source Graph

Endpoints, raw responses, parser candidates, fixtures, source IDs.

### Evidence Graph

API responses, logs, screenshots, fixtures, tests, deployment proofs, contradictions.

### Impact Graph

File -> API -> UI -> source behavior -> user-visible risk -> deployment risk.

### Skill Graph

Skill inputs, outputs, validation contract, install plan, runtime procedure.

### Execution Graph

Agent, job, workflow, artifact, audit, recovery action, completion report.

### Operator Intelligence Graph

Quarter flow, H2H, team form, odds band, score divergence, betting memory, rule versions, backtest outcomes.

## Evidence Pyramid

Deployment-grade evidence starts at Level 4.

| Level | Meaning |
|---|---|
| 0 | Guess |
| 1 | HTML hint |
| 2 | API response |
| 3 | official source |
| 4 | row-level evidence |
| 5 | validated fixture |
| 6 | production API/UI proof |

Example for live bookmaker repair:

```text
1xbet league 2496666
  -> Omsk vs Vorkuta raw event
  -> bookmaker-live parser
  -> team mapping
  -> adapter fixture
  -> /api/results/live
  -> Live tab card
  -> H2H drawer
  -> production proof
```

## Current Production Checkpoints

### PR #36 - Frontend/API Contract Repair

Checkpoint from Execution Fabric audit:

- Branch: `execution-fabric/ipbl-frontend-api-contract-repair`
- Commit: `a14b6375cfccc2b27ef370a25d938e8397d1ac62`
- PR: `#36`
- Preview: `https://ipbl-minimal-viewer-chupfpvom-melloenfrwrks-projects.vercel.app`
- Staged production: `https://ipbl-minimal-viewer-n76iquwf2-melloenfrwrks-projects.vercel.app`
- Audit path: `/root/runtime-audits/ipbl-frontend-api-repair-20260614T050139Z`

Verified:

- `/api/results` accepts approved Pro tags via `division` or `tag`.
- missing year/month defaults safely.
- `/api/teams/history` accepts `range=30`, defaults season, bounds rows, and returns `totalAvailable`.
- men/women Pro team selection avoids cross-gender fallback.
- focused regressions and build passed.
- Vercel preview and staged production APIs verified through protected `vercel curl`.

Not closed in that checkpoint:

- browser UI proof was blocked by Vercel Deployment Protection.
- H2H/quarter matrix visual proof remained open.
- production custom-domain promote was intentionally not run at that moment.

### PR #37 - Live Registry / Team Mapping Repair

Checkpoint from Execution Fabric audit:

- PR: `#37`
- Repair commit: `9882bfe1cab07d9179e7bf265e072ed6dc5f0d82`
- Merge commit: `ebd27282e5cbcb4b03edb29ce53e839df03896b9`
- Verification folder: `/root/runtime-audits/ipbl-frontend-api-repair-20260614T050139Z/14_prod_live_registry_pr37_verify`

Patch:

- `Omsk` -> `ipbl-66-m-pro-a`, `Pro Men A`
- `Vorkuta` -> `ipbl-66-m-pro-a`, `Pro Men A`
- `Kursk/Orenburg` remain mapped to `ipbl-66-w-pro-k`, `Pro Women K`

Verified before merge:

- bookmaker live adapter regression for `2496666` Omsk vs Vorkuta
- bookmaker live adapter regression for `2496667` Kursk vs Orenburg
- approved division tests
- C9 contracts
- production build

Production browser proof now available from the audit folder:

- `?tab=live` rendered `Kursk vs Orenburg`
- division: `Pro Women K`
- score: `31 : 27`
- quarter: `Q2`
- signal: `Q3 OVER / LOW_SCORING_Q1_DECELERATION`

Remaining precision:

- `Omsk/Vorkuta` Pro Men A mapping was patched and unit-tested.
- That exact pair was not active during the captured production browser window.
- Men Pro A live-card proof for that exact pair requires a future active match or a fixture/browser harness.

## Phase Roadmap

Machine-readable ledger:

```text
artifacts/graphify/phase-roadmap.json
```

### Phase 0 - Execution Fabric Baseline

Status: complete.

Includes VM executor, grouped routers, runtime audits, GitHub/Vercel workflow, production operator mode.

### Phase 1 - Graphify Bootstrap

Status: complete / materialized.

Includes Graphify installation, graph extraction, `graphify-out`, graph reports, communities, God Node analysis, and source-discovery corpus.

### Phase 2 - Graphify Skill Installation

Status: complete / materialized in source-discovery context, needs repo-local alignment.

Evidence from VM context includes project-local Graphify skill, `AGENTS.md`, `bin/graphify`, and hook-check path in source-discovery.

### Phase 3 - Repo Archaeology / Code Review Graph

Status: materialized.

Includes repo file index, dependency graph, `.code-review-graph/graph.db`, impact analysis, and patch safety.

### Phase 4 - Source Archaeology Graph

Status: complete / materialized.

Includes official IPBL source, bookmaker source, raw responses, parser candidates, fixtures, validations, production proof nodes, and the canonical source-archaeology graph bundle.

### Phase 5 - Evidence Graph

Status: partially active through runtime audits.

Open work: convert audits, screenshots, API probes, and test results into durable EvidenceNodes and mark superseded evidence explicitly.

### Phase 6 - Skill Forge Materialization

Status: direction established / needs systematic packaging.

Required outputs: skills with inputs, outputs, validation contracts, guardrails, install plans, and artifact bundles.

### Phase 7 - agnix Integration

Status: usable via `npx agnix@0.32.0`; not globally installed.

Open work: make agnix a local/CI gate for `.agents`, `.claude`, `.codex`, `AGENTS.md`, hooks, and MCP configs.

### Phase 8 - GraphRAG Reasoning

Status: established as architecture / not fully productized.

Target behavior: graph-aware answers about missing live cards, source coverage, H2H gaps, and patch impact.

### Phase 9 - Runtime Agent Graph

Status: complete / materialized.

Track AgentNode, WorkflowNode, JobNode, ArtifactNode, AuditNode, RecoveryNode, and the canonical runtime-agent graph snapshot.

### Phase 10 - IPBL Workload Graph

Status: complete / materialized.

Includes Live Source, Official Source, Bookmaker Source, Results, Team Statistics, H2H, Recorder, Release, Evidence, and Operator Intelligence subgraphs.
Canonical artifact: `artifacts/workload-graph/ipbl-workload-graph.json`.

### Phase 10 - IPBL Workload Graph

Status: complete / materialized.

Includes Live Source, Official Source, Bookmaker Source, Results, Team Statistics, H2H, Recorder, Release, Evidence, and Operator Intelligence subgraphs.
Canonical artifact: `artifacts/workload-graph/ipbl-workload-graph.json`.

### Phase 11 - C9 Intelligence

Status: reconciled / proof-foundation complete.

Existing work includes row reconciliation, EventsStat contracts, score-history proof, and active-matched gates.

Open work:

- odds-vs-score divergence feature design
- recorder enrichment write budget
- UI/API movement graph
- Results KV and Team Statistics reconciliation

Contract outputs now include deterministic market timeline keys and score-history alignment points, but those are still evidence surfaces rather than production odds features.

### Phase 12 - GEN / Operator Intelligence

Status: complete / materialized / read-only evidence pack.

Required before production:

- recorder-derived features
- H2H and team form evidence
- odds-band and score-divergence evidence
- rule versions
- data-quality states
- backtest metrics
- holdout validation

Canonical artifact: `artifacts/operator-intelligence/operator-intelligence.json`.

### Phase 13 - Visualization

Status: complete / materialized / read-only catalog.

Preferred outputs:

- Obsidian graph exports
- Graphistry or Gephi views
- optional Neo4j/Kuzu-backed inspection

Canonical artifact: `artifacts/visualization/visualization-catalog.json`.

### Phase 14 - Backend Analysis Engine

Status: complete / materialized / read-only boundary.

The backend analysis engine is where the Graphify community skills are placed in IPBL:

- `graphify-intent` for rationale, decisions, constraints, and tradeoffs.
- `graphify-temporal` for ordering evidence over time and tracing supersession.
- `code-review-graph` remains available for maintenance analysis, but not for the live betting runtime path.

This layer stays behind live ingestion and consumes repository-backed evidence from C9, operator intelligence, and the graph ledgers.

Canonical artifact: `artifacts/analysis-engine/ipbl-analysis-engine.json`.

### Live Betting Intelligence Orchestration

IPBL's live betting path is a separate orchestration layer that sits on top of the backend analysis boundary:

- live recorder and replay evidence feed the quarter-flow pattern layer;
- odds movement is folded into the live pattern layer as confirmation, not as a substitute for recorder evidence;
- `graphify-intent` and `graphify-temporal` provide the reasoning substrate for betting rules and time ordering;
- Worker AI synthesizes live signals into operator-facing summaries;
- `agnix` validates the agent/config wiring around that path.

Frontend exposure map:

- Live tab: score, quarter flow, compact decision block, and a handoff into Intelligence.
- Intelligence tab: Graphify synthesis, recorder/history health, phase coverage, analysis-engine summary, and operator-intelligence summary.
- Backend-only: raw Graphify internals, agnix config details, full replay lists, and deep H2H dumps.

Read-only summary routes used by the surface:

- `GET /api/analysis-engine`
- `GET /api/operator-intelligence`
- `GET /api/gen-analysis`

Canonical worker surface:

- `workers/graphify-intelligence/src/index.ts`
- `workers/graphify-intelligence/src/orchestrator.ts`
- `workers/graphify-intelligence/src/worker-ai.ts`
- `workers/graphify-intelligence/src/state.ts`

Canonical runtime tests:

- `tests/live-pattern-discovery.test.ts`
- `tests/predictions-live-runtime.test.ts`
- `tests/graphify-intelligence-worker.test.ts`
- `tests/graphify-contract.test.ts`
- `tests/agnix-graphify-contract.test.ts`

## Mandatory Change Workflow

Every non-trivial IPBL or Execution Fabric patch should follow:

1. Detect change.
2. Preserve raw source evidence.
3. Update or inspect Graphify/source/evidence graph.
4. Run repo impact graph or code-review graph.
5. Classify source, API, UI, deployment, and operator risk.
6. Materialize scoped skill/update plan.
7. Validate agent/config changes with agnix.
8. Patch the smallest required surface.
9. Run focused tests and build.
10. Verify production API behavior.
11. Verify browser/UI behavior with Chrome/CDP when UI is affected.
12. Record runtime audit evidence.
13. Supersede stale docs/artifacts without deleting history.

## Current Open Gaps

- PR #37 Women K live-card production browser proof exists; Omsk/Vorkuta Men A exact-pair production proof still requires an active match or fixture harness.
- Team Statistics data population is not proven complete.
- C9 intelligence reconciliation is complete; odds deployment remains policy-gated and the productization work continues on the roadmap.
- GEN/operator intelligence is not production-ready.
- Recorder captures live state snapshots, but the future odds timeline, market close/open state, and quarter replay UI are not yet built.
- God Node ledger and phase roadmap now exist in repo but should be refreshed after Graphify reruns.
- Project skills need systematic Skill Forge packaging and agnix validation.
- Root `AGENTS.md` alignment is still open.

## Commands

Focused app gates:

```bash
npm run test:approved-divisions
npm run test:recorder
npm run test:ipbl-source
npm run test:results-hardening
npm run build
```

agnix gate:

```bash
npx agnix@0.32.0 --dry-run --show-fixes --target claude-code .codex .claude .agents
```

Graphify artifacts to inspect before feature work:

```bash
graphify-out/GRAPH_REPORT.md
graphify-out/graph.json
graphify-out/.graphify_analysis.json
graphify-out/obsidian/
.code-review-graph/graph.db
```
