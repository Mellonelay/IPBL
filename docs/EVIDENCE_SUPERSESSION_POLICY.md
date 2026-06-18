# Evidence Supersession Policy

This policy defines how IPBL keeps evidence families, lineage, and supersession relationships readable without mutating production data.

Canonical machine-readable index:
- [artifacts/evidence/evidence-supersession-index.json](/root/repos/IPBL/artifacts/evidence/evidence-supersession-index.json)

## Policy

- Every evidence family must have one canonical index entry.
- If a newer artifact supersedes an older one, the older artifact stays referenced and is not deleted.
- Supersession must be explicit, not implied by file naming.
- Read-only proof artifacts remain immutable once published.
- Evidence records must preserve the command, exit code, and artifact path used to validate them.
- Secrets must never be printed into evidence output.

## Families covered here

- Phase 4 source archaeology
- Phase 5 evidence graph
- Live-source freshness and stale-row remediation
- Phase 10 workload graph
- Phase 12 operator intelligence
- Phase 13 visualization

## Latest stale-row incident

- Production stale live row: gameId `1073505`
- Matchup: Bryansk vs Izhevsk
- Stale score: `81:76`
- Current verification anchor:
  - [tests/live-feed-freshness.test.ts](/root/repos/IPBL/tests/live-feed-freshness.test.ts)
  - [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)
  - [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)

## Operational rules

- Keep the canonical evidence index current when new proof is added.
- Record supersession edges for stale/live-row incidents, refreshed manifests, and replaced reports.
- Keep unresolved gaps visible instead of collapsing them into success.
- Use validation commands as evidence, not prose.

## No secret output rule

- Do not emit tokens, passwords, private keys, or environment secrets.
- Do not copy `.env` contents into evidence manifests.
- Redaction is required before logs are attached to a summary.

