---
type: community
cohesion: 0.22
members: 9
---

# Serverless API Handlers

**Cohesion:** 0.22 - loosely connected
**Members:** 9 nodes

## Members
- [[Calendar Normalization Library]] - code - api/admin/server-lib/calendar-normalize.ts
- [[Cron Sync Results Handler]] - code - api/cron/cron-sync-results.ts
- [[Ingest Results Month Library]] - code - api/admin/server-lib/ingest-results-month.ts
- [[KV REST Env Aliases Library]] - code - api/admin/server-lib/kv-rest-env-aliases.ts
- [[Record Live Handler]] - code - api/cron/record-live.ts
- [[Results API Handler]] - code - api/results.ts
- [[Results Redis API Library]] - code - api/admin/server-lib/results-redis.ts
- [[Results Sync Constants (API)]] - code - api/admin/server-lib/results-sync-constants.ts
- [[Write Results Month to KV Library]] - code - api/admin/server-lib/write-results-month-kv.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Serverless_API_Handlers
SORT file.name ASC
```
