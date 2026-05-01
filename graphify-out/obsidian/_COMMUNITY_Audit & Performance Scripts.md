---
type: community
cohesion: 0.67
members: 3
---

# Audit & Performance Scripts

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[Analyze Performance Script]] - code - scripts/analyze-performance.mjs
- [[Audit Teams Script]] - code - scripts/audit-teams.mjs
- [[Bet History Clean Data]] - document - public/bet_history_clean.json

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Audit_&_Performance_Scripts
SORT file.name ASC
```
