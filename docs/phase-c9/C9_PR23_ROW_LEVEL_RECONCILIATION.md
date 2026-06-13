# Phase C9 PR23 — Deterministic Row-Level Reconciliation

This PR adds a deterministic reconciliation runner for official source, production live, recorder history, and EventsStat reprobe evidence.

## Commands

```bash
npm run reconcile:c9
npm run reprobe:c9-eventsstat
npm run test:c9-reconciliation
```

## Row normalization

Each source row is normalized into a deterministic structure: `source`, `rowKey`, `gameId`, home/away names, normalized team names, score, period, clock, status, and raw key shape.

Matching priority is `gameId`, then normalized home/away pair. `source:index` is only a diagnostic fallback.

## Classification

`RECONCILED` requires at least one matched row and no missing/mismatch records. Otherwise the result is `PARTIAL`.

## EventsStat gate

The default command probes EventsStat only when production has active live games. The fallback reprobe command can sample known IDs, but fallback evidence does not unlock production odds deployment.

Odds deployment remains blocked until active-production EG/SH/DS, row-level reconciliation, source policy, parser tests, and evidence review are all accepted.
