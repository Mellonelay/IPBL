# IPBL Phase Closure Upgrade Master Plan

This is the summary package for the closure / upgrade pass.

## Deliverables

- [docs/PHASE_CLOSURE_CURRENT_STATE.md](/root/repos/IPBL/docs/PHASE_CLOSURE_CURRENT_STATE.md)
- [docs/BACKEND_RESPONSIBILITIES_CHECKLIST.md](/root/repos/IPBL/docs/BACKEND_RESPONSIBILITIES_CHECKLIST.md)
- [docs/EVIDENCE_SUPERSESSION_POLICY.md](/root/repos/IPBL/docs/EVIDENCE_SUPERSESSION_POLICY.md)
- [docs/GRAPHIFY_FRESHNESS_RUNBOOK.md](/root/repos/IPBL/docs/GRAPHIFY_FRESHNESS_RUNBOOK.md)
- [docs/AGNIX_ENFORCEMENT_MATRIX.md](/root/repos/IPBL/docs/AGNIX_ENFORCEMENT_MATRIX.md)
- [docs/LIVE_SOURCE_DRIFT_DETECTION.md](/root/repos/IPBL/docs/LIVE_SOURCE_DRIFT_DETECTION.md)
- [docs/OPERATOR_INTELLIGENCE_REFRESH_PLAN.md](/root/repos/IPBL/docs/OPERATOR_INTELLIGENCE_REFRESH_PLAN.md)
- [docs/VISUALIZATION_DRILLDOWN_UPGRADE_PLAN.md](/root/repos/IPBL/docs/VISUALIZATION_DRILLDOWN_UPGRADE_PLAN.md)
- [artifacts/evidence/evidence-supersession-index.json](/root/repos/IPBL/artifacts/evidence/evidence-supersession-index.json)
- [artifacts/graphify/freshness/graphify-freshness-report.json](/root/repos/IPBL/artifacts/graphify/freshness/graphify-freshness-report.json)
- [artifacts/graphify/freshness/god-node-freshness-report.json](/root/repos/IPBL/artifacts/graphify/freshness/god-node-freshness-report.json)
- [artifacts/evidence/live-source-drift-check-latest.json](/root/repos/IPBL/artifacts/evidence/live-source-drift-check-latest.json)
- [artifacts/operator-intelligence/operator-intelligence-refresh-plan.json](/root/repos/IPBL/artifacts/operator-intelligence/operator-intelligence-refresh-plan.json)
- [artifacts/visualization/visualization-upgrade-plan.json](/root/repos/IPBL/artifacts/visualization/visualization-upgrade-plan.json)
- [artifacts/evidence/ipbl-phase-closure-upgrade-summary.json](/root/repos/IPBL/artifacts/evidence/ipbl-phase-closure-upgrade-summary.json)

## Phase mapping

- Complete: 0, 1, 4, 8, 9, 10, 12, 13
- Support-ready: 2, 3, 5, 6, 7, 11
- Open: 0

## Evidence and tests

- Graphify freshness and God Node coverage are documented rather than regenerated into a new runtime layer.
- The stale live-row fix is anchored by [tests/live-feed-freshness.test.ts](/root/repos/IPBL/tests/live-feed-freshness.test.ts) and [scripts/validate-phase-master.sh](/root/repos/IPBL/scripts/validate-phase-master.sh).
- The support-ready phases remain support-ready; none are reopened as implementation phases.
- The live-source and operator-intelligence plans are read-only packaging artifacts.

## Risks

- Browser tooling may be unavailable in the current environment, so UI proof can fall back to API verification only.
- Graphify and God Node freshness can drift after future code changes if `graphify update .` is not rerun.
- Hidden repo-root dirty files remain outside this isolated branch and were intentionally not touched.

## Next gates

- Validate every JSON artifact with `python -m json.tool`.
- Run the strongest safe repo-local validation commands available from `package.json`.
- Keep the worktree clean inside this branch before deciding whether to commit.

## Push / PR commands if auth is available

```bash
git push -u origin <branch>
gh pr create --title "chore(ipbl): add phase closure upgrade package" --body "$(cat <<'EOF'
## Summary
- Adds closure-state, evidence-supersession, freshness, and upgrade-plan documentation.
- Keeps completed phases closed and support-ready phases documented.
- Preserves read-only validation surfaces and stale-row evidence.

## Test Plan
- [ ] `python -m json.tool` over all JSON artifacts
- [ ] `npm run build`
- [ ] `npm run test:bookmaker-live`
- [ ] `npm run test:ipbl-workload-graph`
- [ ] `npm run test:operator-intelligence`
- [ ] `npm run test:visualization-catalog`
- [ ] `npm run ops:vercel-preflight`
EOF
)"
```

## Completion rule

- Do not claim completion until verification artifacts and command results are recorded.
- Do not mutate production data.
- Do not reopen closed phases.

