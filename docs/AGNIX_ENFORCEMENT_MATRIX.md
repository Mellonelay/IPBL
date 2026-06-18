# agnix Enforcement Matrix

Current config and policy paths:
- [.agnix.toml](/root/repos/IPBL/.agnix.toml)
- [.codex/config.toml](/root/repos/IPBL/.codex/config.toml)
- [.codex/hooks.json](/root/repos/IPBL/.codex/hooks.json)
- [AGENTS.md](/root/repos/IPBL/AGENTS.md)
- [.agents/skills/ipbl/SKILL.md](/root/repos/IPBL/.agents/skills/ipbl/SKILL.md)
- [.claude/skills/ipbl/SKILL.md](/root/repos/IPBL/.claude/skills/ipbl/SKILL.md)
- [docs/ops/VERCEL_EXECUTION_FABRIC_WORKFLOW.md](/root/repos/IPBL/docs/ops/VERCEL_EXECUTION_FABRIC_WORKFLOW.md)

## Covered surfaces

- Agent instructions and repo entrypoints.
- Skill packaging and skill-local guidance.
- Hook policies and local Codex config.
- Vercel workflow policy text.
- Repo-local validation entrypoints that should stay aligned with the config surface.

## Uncovered surfaces

- Live production runtime behavior.
- Browser-only UX behavior.
- Mutable deployment state.
- External dependency availability.
- Secret values or token contents.

## Enforcement levels

| Level | Meaning | Typical use |
|---|---|---|
| block | Must fail the gate. | Invalid agent config, missing required repo instructions, secret leakage. |
| review | Must be surfaced for human review. | Partial alignment, stale docs, missing evidence links. |
| observe | Record only. | Known historical debt, read-only drift notes, unsupported optional surfaces. |

## Recommended CI / preflight gate

- Run `npx agnix@0.32.0 .` as a repo-local preflight.
- Follow with the strongest relevant repo validation command for the surface under change.
- Keep the gate read-only unless a separate explicit deployment gate exists.
- Fail fast on config drift, but report historical debt separately from new drift.

## No secret output rule

- Never print `VERCEL_TOKEN`, `VERCEL_OIDC_TOKEN`, `NPM_TOKEN`, or `.env` contents.
- Never echo credentials into logs or JSON evidence.
- Redact environment details before attaching logs to artifacts.

