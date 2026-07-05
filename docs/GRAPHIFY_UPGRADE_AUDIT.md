# Graphify Upgrade Audit

Graphify is part of the betting-intelligence substrate, so upgrades must be controlled.

## Current Contract

The repo already materializes graph evidence with these top-level fields:

- `communities`
- `cohesion`
- `gods`
- `surprises`
- `questions`

Those keys are the baseline contract for `graphify-out/.graphify_analysis.json`.

## Upgrade Rules

1. Pin the current Graphify behavior.
2. Run the graph contract tests.
3. Upgrade Graphify in a controlled branch.
4. Re-run the same graph contract tests.
5. Only then allow the new version into the live betting intelligence path.

## Live Path Constraints

- `graphify-intent` stays on the reasoning path.
- `graphify-temporal` stays on the ordering path.
- `code-review-graph` stays out of the production betting runtime path.
- Worker AI is a synthesis layer on top of Graphify outputs, not a replacement for them.

## Practical Checks

Use these checks before and after any version bump:

```bash
npm run test:graphify-intelligence
npm run test:analysis-engine
```

If any artifact shape changes, update the contract tests and the roadmap first, then re-run the checks.
