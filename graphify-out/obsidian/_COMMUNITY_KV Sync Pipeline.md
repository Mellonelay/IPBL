---
type: community
cohesion: 0.21
members: 13
---

# KV Sync Pipeline

**Cohesion:** 0.21 - loosely connected
**Members:** 13 nodes

## Members
- [[applyKvRestEnvAliases()]] - code - api\admin\server-lib\kv-rest-env-aliases.ts
- [[canonicalDivisionLabel()]] - code - api\admin\server-lib\results-sync-constants.ts
- [[handler()]] - code - api\results.ts
- [[isApprovedResultsTag()]] - code - api\admin\server-lib\results-sync-constants.ts
- [[isKvRestConfigured()]] - code - api\admin\server-lib\kv-rest-env-aliases.ts
- [[kv-rest-env-aliases.ts]] - code - api\admin\server-lib\kv-rest-env-aliases.ts
- [[requireResultsRedis()]] - code - api\admin\server-lib\results-redis.ts
- [[results-redis.ts]] - code - api\admin\server-lib\results-redis.ts
- [[results-sync-constants.ts]] - code - api\admin\server-lib\results-sync-constants.ts
- [[results.ts]] - code - api\results.ts
- [[resultsKvKey()]] - code - api\admin\server-lib\results-sync-constants.ts
- [[trimEnv()]] - code - api\admin\server-lib\kv-rest-env-aliases.ts
- [[write-results-month-kv.ts]] - code - api\admin\server-lib\write-results-month-kv.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/KV_Sync_Pipeline
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Result Ingestion Constants]]
- 2 edges to [[_COMMUNITY_Upstash KV Client Configuration]]

## Top bridge nodes
- [[results-sync-constants.ts]] - degree 6, connects to 1 community
- [[results-redis.ts]] - degree 5, connects to 1 community
- [[write-results-month-kv.ts]] - degree 4, connects to 1 community
- [[requireResultsRedis()]] - degree 2, connects to 1 community