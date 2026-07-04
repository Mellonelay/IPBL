# Team Statistics Reconciliation

Team Statistics is reconciled to the same source model now used by H2H:

```text
Results KV historical months
+ official /calendar/online current rows
+ official /calendar daily windows for recent confirmed rows
→ /api/teams/history
→ Team Statistics profile
→ Game Details / H2H drawer
```

## Boundary

- 13 approved live divisions.
- 50 verified current teams.
- Pro Men Z currently has the two verified official teams Anapa and Magadan.
- Historical Pro Men G may remain in Results storage code for old months only; it is not part of the current live Team Statistics boundary.

## Reconciliation command

```bash
npm run reconcile:team-statistics
```

The command writes:

```text
artifacts/team-statistics/team-statistics-reconciliation-latest.json
```

It checks:

- registry division count;
- team count and uniqueness;
- expected teams per division;
- production `/api/teams/history` status per team;
- source coverage metadata;
- latest history row;
- quarter matrix availability;
- no odds deployment policy.

## Policy

Team Statistics percentages are descriptive only. They are not betting probabilities and cannot enable odds deployment without the separate C9 odds parser policy, backtesting, and review gates.
