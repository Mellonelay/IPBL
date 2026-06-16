#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "[PHASE 6] SKILL FORGE CHECKS"
test -f AGENTS.md
test -f .agents/skills/ipbl/SKILL.md
test -f .claude/skills/ipbl/SKILL.md
test -f .codex/AGENTS.md
test -f .codex/hooks.json
test -f .agnix.toml
test -f docs/PHASE_6_7_EVIDENCE_MANIFEST.md

echo "[PHASE 7] AGNIX GATE"
npx agnix@0.32.0 .

echo "[PHASE 6-7] COMPLETE"
