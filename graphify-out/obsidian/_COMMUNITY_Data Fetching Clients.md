---
type: community
cohesion: 0.35
members: 12
---

# Data Fetching Clients

**Cohesion:** 0.35 - loosely connected
**Members:** 12 nodes

## Members
- [[base()]] - code - src\api\client.ts
- [[clearFetchCaches()]] - code - src\api\client.ts
- [[client.ts]] - code - src\api\client.ts
- [[fetchBoxScore()]] - code - src\api\client.ts
- [[fetchGame()]] - code - src\api\client.ts
- [[fetchOnline()]] - code - src\api\client.ts
- [[fetchSchedule()]] - code - src\api\client.ts
- [[fetchTeamGames()]] - code - src\api\client.ts
- [[formatApiDate()_2]] - code - src\api\client.ts
- [[getJson()]] - code - src\api\client.ts
- [[q()]] - code - src\api\client.ts
- [[seasonFromDate()]] - code - src\api\client.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Data_Fetching_Clients
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Score Normalization Flow]]

## Top bridge nodes
- [[fetchOnline()]] - degree 5, connects to 1 community
- [[fetchSchedule()]] - degree 5, connects to 1 community
- [[fetchTeamGames()]] - degree 4, connects to 1 community