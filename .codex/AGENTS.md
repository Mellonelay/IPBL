# ECC for Codex CLI

This supplements the root `AGENTS.md` with a repo-local ECC baseline.

## Repo Skill

- Repo-generated Codex skill: `.agents/skills/ipbl/SKILL.md`
- Claude-facing companion skill: the repo's Claude workspace companion skill, if present
- Keep user-specific credentials and private MCPs in the user Codex config, not in this repo.

## MCP Baseline

Treat `.codex/config.toml` as the default ECC-safe baseline for work in this repository.
The generated baseline enables GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking.

## Precedence

This file is subordinate to the repository root `AGENTS.md` and only narrows guidance for the `.codex/` subtree.

## Closure Workflows

- `graphify-source-archaeology`
- `live-source-repair`
- `vercel-verification`
- `evidence-finalization`
- `gen-planning`

## Multi-Agent Support

- Explorer: read-only evidence gathering
- Reviewer: correctness, security, and regression review
- Docs researcher: API and release-note verification

## Workflow Files

- No dedicated workflow command files were generated for this repo.

Use these workflow files as reusable task scaffolds when the detected repository workflows recur.
