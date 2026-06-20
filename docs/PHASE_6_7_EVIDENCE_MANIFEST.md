# Phase 6-7 Evidence Manifest

Source of truth:
- [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)
- [docs/CODEX_ECOSYSTEM_STRATEGY_20260615.md](/root/repos/IPBL/docs/CODEX_ECOSYSTEM_STRATEGY_20260615.md)
- [docs/CURRENT_PROJECT_SYNC_20260615.md](/root/repos/IPBL/docs/CURRENT_PROJECT_SYNC_20260615.md)
- [docs/PHASE_MASTER_INDEX.md](/root/repos/IPBL/docs/PHASE_MASTER_INDEX.md)

This manifest is read-only. It maps the repo’s existing skill packaging and agnix configuration into the canonical Phase 6 and Phase 7 checkpoints.

## Phase 6 - Skill Forge Materialization

### Status

- Direction established / packaging open.

### Existing evidence

- Repo skill baseline:
  - [AGENTS.md](/root/repos/IPBL/AGENTS.md)
  - [.agents/skills/ipbl/SKILL.md](/root/repos/IPBL/.agents/skills/ipbl/SKILL.md)
  - [.claude/skills/ipbl/SKILL.md](/root/repos/IPBL/.claude/skills/ipbl/SKILL.md)
- Codex-local instruction and hook support:
  - [.codex/AGENTS.md](/root/repos/IPBL/.codex/AGENTS.md)
  - [.codex/hooks.json](/root/repos/IPBL/.codex/hooks.json)
  - [.codex/config.toml](/root/repos/IPBL/.codex/config.toml)
- Design and operating context:
  - [docs/CODEX_ECOSYSTEM_STRATEGY_20260615.md](/root/repos/IPBL/docs/CODEX_ECOSYSTEM_STRATEGY_20260615.md)
  - [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)

### Remaining gap

- The repository still treats IPBL as a single broad skill baseline.
- The roadmap calls for narrower skill packaging, especially for Graphify source archaeology, live-source repair, Vercel verification, evidence finalization, and GEN planning.
- The phase is therefore supported, but the packaging can still be split further if future work needs narrower skill boundaries.

### Canonical workflow names

- `graphify-source-archaeology`
- `live-source-repair`
- `vercel-verification`
- `evidence-finalization`
- `gen-planning`

## Phase 7 - agnix Integration

### Status

- Usable via `npx agnix@0.32.0`; local/CI gate open.

### Existing evidence

- Agnix config and validation surface:
  - [.agnix.toml](/root/repos/IPBL/.agnix.toml)
  - [docs/CODEX_ECOSYSTEM_STRATEGY_20260615.md](/root/repos/IPBL/docs/CODEX_ECOSYSTEM_STRATEGY_20260615.md)
  - [docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md](/root/repos/IPBL/docs/GRAPHIFY_INTELLIGENCE_ROADMAP.md)
- Validation entrypoints:
  - [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh)
  - [package.json](/root/repos/IPBL/package.json)

### Remaining gap

- agnix is verified and usable, but it remains a repo-local validation gate rather than a globally standardized preflight for every agent/config path.
- The active CLI must continue to be invoked with paths rather than unsupported include flags.

## Recommended validation

```bash
npx agnix@0.32.0 .
bash scripts/validate-phase-master.sh
```

## Scope boundaries

- No runtime behavior is added here.
- No skill semantics are changed here.
- This manifest only documents the existing Phase 6-7 evidence and validation surface.
