---
type: community
cohesion: 0.32
members: 12
---

# Score Normalization Flow

**Cohesion:** 0.32 - loosely connected
**Members:** 12 nodes

## Members
- [[computeH2H()]] - code - src\api\normalize.ts
- [[dedupeLiveGames()]] - code - src\api\normalize.ts
- [[getScoreText()_1]] - code - src\api\normalize.ts
- [[isTrulyLiveRow()_1]] - code - src\api\normalize.ts
- [[normalize.ts]] - code - src\api\normalize.ts
- [[normalizeCalendarRow()_1]] - code - src\api\normalize.ts
- [[numberOrNull()_1]] - code - src\api\normalize.ts
- [[parseCalendarItems()_1]] - code - src\api\normalize.ts
- [[parseTeamHistory()]] - code - src\api\normalize.ts
- [[teamRef()_1]] - code - src\api\normalize.ts
- [[text()_1]] - code - src\api\normalize.ts
- [[toLiveGame()]] - code - src\api\normalize.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Score_Normalization_Flow
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Data Fetching Clients]]
- 1 edge to [[_COMMUNITY_Result Ingestion Constants]]

## Top bridge nodes
- [[parseCalendarItems()_1]] - degree 5, connects to 2 communities
- [[parseTeamHistory()]] - degree 3, connects to 1 community
- [[dedupeLiveGames()]] - degree 2, connects to 1 community