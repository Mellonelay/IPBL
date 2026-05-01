---
type: community
cohesion: 0.54
members: 8
---

# Upstash KV Client Configuration

**Cohesion:** 0.54 - moderately connected
**Members:** 8 nodes

## Members
- [[applyKvRestEnvAliases()_1]] - code - lib\kv-env.ts
- [[getResultsRedis()_1]] - code - lib\results-redis.ts
- [[getResultsRedis()]] - code - api\admin\server-lib\results-redis.ts
- [[isKvRestConfigured()_1]] - code - lib\kv-env.ts
- [[kv-env.ts]] - code - lib\kv-env.ts
- [[requireResultsRedis()_1]] - code - lib\results-redis.ts
- [[results-redis.ts_1]] - code - lib\results-redis.ts
- [[trimEnv()_1]] - code - lib\kv-env.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Upstash_KV_Client_Configuration
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_KV Sync Pipeline]]
- 1 edge to [[_COMMUNITY_Result Ingestion Constants]]

## Top bridge nodes
- [[getResultsRedis()]] - degree 5, connects to 1 community
- [[requireResultsRedis()_1]] - degree 3, connects to 1 community