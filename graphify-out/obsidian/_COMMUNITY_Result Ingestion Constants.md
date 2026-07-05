---
type: community
cohesion: 0.19
members: 17
---

# Result Ingestion Constants

**Cohesion:** 0.19 - loosely connected
**Members:** 17 nodes

## Members
- [[buildStoredMonthMap()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[canonicalDivisionLabel()_1]] - code - src\config\divisions.ts
- [[createEmptyMonthMap()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[divisions.ts]] - code - src\config\divisions.ts
- [[fetchCalendarDay()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[fetchScheduleGamesForMonth()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[formatApiDate()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[ingest-results-month.ts]] - code - api\admin\server-lib\ingest-results-month.ts
- [[isApprovedResultsTag()_1]] - code - lib\results-constants.ts
- [[monthDayKeys()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[normalizeCalendarDate()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[normalizeCalendarGame()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[parseQuarterTotals()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[results-constants.ts]] - code - lib\results-constants.ts
- [[resultsKvKey()_1]] - code - lib\results-constants.ts
- [[startOfLocalDay()]] - code - api\admin\server-lib\ingest-results-month.ts
- [[writeResultsMonthToKv()]] - code - api\admin\server-lib\write-results-month-kv.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Result_Ingestion_Constants
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_KV Sync Pipeline]]
- 1 edge to [[_COMMUNITY_Legacy Normalization Lib]]
- 1 edge to [[_COMMUNITY_Score Normalization Flow]]
- 1 edge to [[_COMMUNITY_Upstash KV Client Configuration]]

## Top bridge nodes
- [[ingest-results-month.ts]] - degree 13, connects to 2 communities
- [[writeResultsMonthToKv()]] - degree 6, connects to 2 communities
- [[fetchCalendarDay()]] - degree 4, connects to 1 community