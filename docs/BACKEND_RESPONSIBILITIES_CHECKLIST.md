# Backend Responsibilities Checklist

Backend owns truth, reconciliation, validation, graph generation, evidence lineage, and intelligence outputs.
Frontend must not own source truth.

## Phase 4

- Parse official and bookmaker source shapes.
- Capture raw responses without mutating production data.
- Preserve fixtures and parser candidates for proof review.
- Maintain validations that prove the source chain still matches the contract.
- Keep the proof bundle canonical and read-only.

## Phase 5

- Maintain the evidence graph and canonical evidence index.
- Track artifact lineage and supersession relationships.
- Record what supersedes what, and why.
- Preserve canonical evidence families instead of scattering ad hoc references.
- Keep the index audit-friendly and machine-parseable.

## Phase 8

- Record quarter-state snapshots deterministically.
- Keep live snapshot normalization read-only.
- Alarm on freshness regressions.
- Verify replay completeness before claiming support readiness.
- Keep recorder outputs aligned with approved live division coverage.

## Phase 10

- Maintain the workload graph over live, results, H2H, team-statistics, betting-record, and release surfaces.
- Detect live-source drift and mismatches across official and bookmaker inputs.
- Keep live-source freshness checks independent from presentation concerns.
- Preserve alignment between workload graph nodes and evidence artifacts.

## Phase 11

- Reconcile C9 rows and events stat contracts.
- Track odds-vs-score divergence evidence.
- Keep reconciliation artifacts read-only and reproducible.
- Document fallback or gap states instead of hiding them.

## Phase 12

- Produce operator intelligence outputs from repository-backed evidence only.
- Keep backtests auditable and reproducible.
- Score data quality before enabling any recommendations.
- Preserve the evidence-only mode until release-grade gating is satisfied.

## Phase 13

- Maintain visualization catalogs and export surfaces.
- Keep graph drill-downs backed by existing evidence artifacts.
- Preserve export fidelity and path stability.
- Keep the visualization layer read-only with no truth ownership.

## Frontend boundary

- Frontend may render summaries, charts, drill-downs, and navigation.
- Frontend may not decide canonical truth, reconcile source conflicts, or supersede evidence.
- Frontend may not mutate source-of-truth artifacts.

