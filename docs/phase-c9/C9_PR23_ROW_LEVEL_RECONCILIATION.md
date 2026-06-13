# Phase C9 PR23 — Deterministic Row-Level Reconciliation

This PR adds a deterministic reconciliation runner for official source, production live, recorder history, and EventsStat reprobe evidence.

## Commands

```bash
npm run reconcile:c9
npm run reprobe:c9-eventsstat
npm run test:c9-reconciliation
```

## Source semantics

Official calendar evidence is fetched through the canonical Worker proxy route:

```text
https://worker.mloneslot99.com/ipbl-proxy/calendar/online?tag=<approved-live-tag>&lang=ru
```

Recorder history evidence is fetched with the required row-level key semantics:

```text
/api/recorder/history?division=<divisionTag>&gameId=<gameId>&limit=<n>
```

The reconciliation runner derives recorder-history targets from active production rows and `/api/recorder/status.activeGameKeys`.

When production live is official-first, the runner also samples current Melbet IPBL live events (`Get1x2_VZip`, leagues 2496666/2496667) and maps candidate EventsStat IDs to active production rows by normalized team pair before probing `GetHistoryGraphExt`.
It probes all current Melbet IPBL candidate IDs for evidence, while keeping a separate `activeMatchedEventsstatProven` field so unmapped live proof cannot be mistaken for row-matched active production proof.

## Row normalization

Each source row is normalized into a deterministic structure: `source`, `rowKey`, `gameId`, `divisionTag`, home/away names, normalized team names, score, period, clock, status, and raw key shape. The normalizer strips bookmaker gender suffixes such as `(Women)` and `Women` before team-pair comparison, matching the production bookmaker adapter behavior.

Matching priority is scoped `divisionTag:gameId`, then `gameId`, then normalized home/away pair. `source:index` is only a diagnostic fallback.

## Classification

`RECONCILED` requires at least one matched row and no missing/mismatch records. Otherwise the result is `PARTIAL`.

## EventsStat gate

The default command probes EventsStat only when production has active live games. The fallback reprobe command can sample known IDs, but fallback evidence does not unlock production odds deployment.

Odds deployment remains blocked until active-production EG/SH/DS, row-level reconciliation, source policy, parser tests, and evidence review are all accepted.

The odds implementation gate is explicit: `oddsImplementationGate.requiresActiveMatchedEventsstatProven` must be `true` and `oddsImplementationGate.passed` must be `true`. PR23 never sets `oddsDeploymentAllowed=true`; it only records whether the prerequisite evidence exists.
