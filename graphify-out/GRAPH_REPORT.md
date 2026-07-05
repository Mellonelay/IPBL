# Graph Report - .  (2026-05-01)

## Corpus Check
- Corpus is ~17,459 words - fits in a single context window. You may not need a graph.

## Summary
- 271 nodes · 262 edges · 78 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Logic & Operator Analysis|Core Logic & Operator Analysis]]
- [[_COMMUNITY_Result Ingestion Constants|Result Ingestion Constants]]
- [[_COMMUNITY_Operator Rule Engine|Operator Rule Engine]]
- [[_COMMUNITY_KV Sync Pipeline|KV Sync Pipeline]]
- [[_COMMUNITY_Data Fetching Clients|Data Fetching Clients]]
- [[_COMMUNITY_Score Normalization Flow|Score Normalization Flow]]
- [[_COMMUNITY_Calendar State Management|Calendar State Management]]
- [[_COMMUNITY_Serverless API Handlers|Serverless API Handlers]]
- [[_COMMUNITY_Frontend React Components|Frontend React Components]]
- [[_COMMUNITY_Legacy Normalization Lib|Legacy Normalization Lib]]
- [[_COMMUNITY_Upstash KV Client Configuration|Upstash KV Client Configuration]]
- [[_COMMUNITY_Calendar Utils|Calendar Utils]]
- [[_COMMUNITY_Historical Results Fetching|Historical Results Fetching]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Audit & Performance Scripts|Audit & Performance Scripts]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_API Proxy Layer|API Proxy Layer]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]

## God Nodes (most connected - your core abstractions)
1. `normalizeCalendarRow()` - 7 edges
2. `getJson()` - 7 edges
3. `normalizeCalendarRow()` - 7 edges
4. `writeResultsMonthToKv()` - 6 edges
5. `q()` - 6 edges
6. `App Component` - 6 edges
7. `evaluateOperatorDecision` - 6 edges
8. `buildStoredMonthMap()` - 5 edges
9. `getResultsRedis()` - 5 edges
10. `trimEnv()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `H2H Verification Test` --semantically_similar_to--> `App Component`  [INFERRED] [semantically similar]
  scripts/verify-h2h-drawer.mjs → src/App.tsx
- `fetchOnline()` --calls--> `dedupeLiveGames()`  [INFERRED]
  src\api\client.ts → src\api\normalize.ts
- `fetchCalendarDay()` --calls--> `parseCalendarItems()`  [INFERRED]
  api\admin\server-lib\ingest-results-month.ts → src\api\normalize.ts
- `writeResultsMonthToKv()` --calls--> `isApprovedResultsTag()`  [INFERRED]
  api\admin\server-lib\write-results-month-kv.ts → lib\results-constants.ts
- `writeResultsMonthToKv()` --calls--> `resultsKvKey()`  [INFERRED]
  api\admin\server-lib\write-results-month-kv.ts → lib\results-constants.ts

## Hyperedges (group relationships)
- **Hydration Process** — hydrate_final_script, hydrate_hybrid_script, hydrate_master_script [EXTRACTED]
- **Results Sync Pipeline** — cron_sync_results_handler, write_results_month_kv_lib, ingest_results_month_lib, calendar_normalize_lib [EXTRACTED]
- **KV Isolation Pattern** — calendar_normalize_lib, results_sync_constants_api, results_redis_api_lib, kv_rest_env_aliases_lib [EXTRACTED]
- **Betting Memory System** — build_bet_memory_buildindex, usebettingmemory_usebettingmemory, bettingmemorydrawersection_bettingmemorydrawersection [INFERRED 0.90]

## Communities

### Community 0 - "Core Logic & Operator Analysis"
Cohesion: 0.19
Nodes (12): analyzeQuarterFlow(), asRecord(), deepFind(), evaluateOperatorDecision(), getHistoricalContext(), getPeriodMinutes(), getScoreboardAnalysis(), matchupKey() (+4 more)

### Community 1 - "Result Ingestion Constants"
Cohesion: 0.19
Nodes (14): canonicalDivisionLabel(), isApprovedResultsTag(), resultsKvKey(), buildStoredMonthMap(), createEmptyMonthMap(), fetchCalendarDay(), fetchScheduleGamesForMonth(), formatApiDate() (+6 more)

### Community 2 - "Operator Rule Engine"
Cohesion: 0.15
Nodes (16): operatorRules, operatorSummary, analyzeQuarterFlow, asRecord, deepFind, evaluateOperatorDecision, getHistoricalContext, getPeriodMinutes (+8 more)

### Community 3 - "KV Sync Pipeline"
Cohesion: 0.21
Nodes (4): applyKvRestEnvAliases(), isKvRestConfigured(), trimEnv(), requireResultsRedis()

### Community 4 - "Data Fetching Clients"
Cohesion: 0.35
Nodes (9): base(), fetchBoxScore(), fetchGame(), fetchOnline(), fetchSchedule(), fetchTeamGames(), formatApiDate(), getJson() (+1 more)

### Community 5 - "Score Normalization Flow"
Cohesion: 0.32
Nodes (9): dedupeLiveGames(), getScoreText(), isTrulyLiveRow(), normalizeCalendarRow(), numberOrNull(), parseCalendarItems(), parseTeamHistory(), teamRef() (+1 more)

### Community 7 - "Calendar State Management"
Cohesion: 0.33
Nodes (9): buildDivisionConfigs(), cloneCalendarMap(), createEmptyMonthMap(), createSkeletonResultsCalendarMap(), fetchResultsMonthFromApi(), isCalendarMapCompleteForMonth(), isoDate(), monthDayKeys() (+1 more)

### Community 8 - "Serverless API Handlers"
Cohesion: 0.22
Nodes (9): Calendar Normalization Library, Cron Sync Results Handler, Ingest Results Month Library, KV REST Env Aliases Library, Record Live Handler, Results API Handler, Results Redis API Library, Results Sync Constants (API) (+1 more)

### Community 9 - "Frontend React Components"
Cohesion: 0.22
Nodes (9): App Component, LiveCard Component, fetchOnline, fetchResultsCalendar, computeH2H, parseCalendarItems, ResultsCalendarGrid, useBettingMemory (+1 more)

### Community 10 - "Legacy Normalization Lib"
Cohesion: 0.57
Nodes (7): getScoreText(), isTrulyLiveRow(), normalizeCalendarRow(), numberOrNull(), parseCalendarItems(), teamRef(), text()

### Community 11 - "Upstash KV Client Configuration"
Cohesion: 0.54
Nodes (6): applyKvRestEnvAliases(), isKvRestConfigured(), trimEnv(), getResultsRedis(), requireResultsRedis(), getResultsRedis()

### Community 12 - "Calendar Utils"
Cohesion: 0.4
Nodes (6): buildDivisionConfigs, createEmptyMonthMap, createSkeletonResultsCalendarMap, isCalendarMapCompleteForMonth, isoDate, monthDayKeys

### Community 13 - "Historical Results Fetching"
Cohesion: 0.6
Nodes (3): fetchResultsCalendar(), formatApiDate(), formatIsoDate()

### Community 15 - "Community 15"
Cohesion: 0.83
Nodes (3): main(), sleep(), snapshotH2h()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): handler(), run()

### Community 18 - "Audit & Performance Scripts"
Cohesion: 0.67
Nodes (3): Analyze Performance Script, Audit Teams Script, Bet History Clean Data

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (3): cloneCalendarMap, fetchResultsMonthFromApi, sessionKey

### Community 30 - "API Proxy Layer"
Cohesion: 1.0
Nodes (2): IPBL Pro API, Live Proxy Handler

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): Backfill Results Script, loadEnvLocal

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Hydrate Final Script

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Hydrate Hybrid Script

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Hydrate Master Script

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Vite Configuration

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): KV Env Library

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Results Constants Library

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Results Redis Library

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Analyze Calendar Sample Script

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): buildIndex

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): runAutonomousCycle

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): validateSession

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): fetchBoxScore

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): BettingMemoryDrawerSection

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): BettingRecord Component

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): LIVE_DIVISIONS

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): MetricSummary

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): RiskEntry

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): QuarterKey

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): ScoreboardAnalysis

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): QuarterFlowAnalysis

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): OperatorDecision

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): EvaluateInput

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): asNumber

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): parseH2HQuarterMatrix

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): IPBL Barrel

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): MockInsight

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): demoGameMeta

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): demoBoxRaw

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): makeLiveGame

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): makeResultGame

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): liveDemoGame

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): resultDemoGame

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): demoH2H

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): CalendarGridGame

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): CalendarGridDivision

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): CalendarGridMap

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): RESULTS_DIVISION_TAGS

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): RESULTS_DIVISIONS

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): sessionCache

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): inflight

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): clearResultsCalendarCache

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): Architecture-First

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): UI Reads, Jobs Write

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Node ESM

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Cross-Platform Compatibility

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): root element

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): main.tsx script

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): IPBL minimal score viewer

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): API routing

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): node.exe

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): python.exe

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): cl.exe

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): UI Stabilization & Debugging Plan

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Betting Memory Index

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): IPBL Operator Console Data Contracts

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Canonical division tag map

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Live contract

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): Results contract

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): Live Proof Screenshot

## Knowledge Gaps
- **81 isolated node(s):** `Hydrate Final Script`, `Hydrate Hybrid Script`, `Hydrate Master Script`, `Vite Configuration`, `Cron Sync Results Handler` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (3 nodes): `cron-sync-results.ts`, `handler()`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Proxy Layer`** (2 nodes): `IPBL Pro API`, `Live Proxy Handler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `Backfill Results Script`, `loadEnvLocal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Hydrate Final Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Hydrate Hybrid Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Hydrate Master Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Vite Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `KV Env Library`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Results Constants Library`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Results Redis Library`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Analyze Calendar Sample Script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `buildIndex`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `runAutonomousCycle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `validateSession`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `fetchBoxScore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `BettingMemoryDrawerSection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `BettingRecord Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `LIVE_DIVISIONS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `MetricSummary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `RiskEntry`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `QuarterKey`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `ScoreboardAnalysis`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `QuarterFlowAnalysis`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `OperatorDecision`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `EvaluateInput`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `asNumber`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `parseH2HQuarterMatrix`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `IPBL Barrel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `MockInsight`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `demoGameMeta`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `demoBoxRaw`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `makeLiveGame`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `makeResultGame`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `liveDemoGame`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `resultDemoGame`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `demoH2H`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `CalendarGridGame`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `CalendarGridDivision`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `CalendarGridMap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `RESULTS_DIVISION_TAGS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `RESULTS_DIVISIONS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `sessionCache`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `inflight`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `clearResultsCalendarCache`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `Architecture-First`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `UI Reads, Jobs Write`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Node ESM`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Cross-Platform Compatibility`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `root element`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `main.tsx script`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `IPBL minimal score viewer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `API routing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `node.exe`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `python.exe`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `cl.exe`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `UI Stabilization & Debugging Plan`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Betting Memory Index`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `IPBL Operator Console Data Contracts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Canonical division tag map`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Live contract`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `Results contract`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `Live Proof Screenshot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseCalendarItems()` connect `Score Normalization Flow` to `Result Ingestion Constants`, `Data Fetching Clients`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `fetchCalendarDay()` connect `Result Ingestion Constants` to `Score Normalization Flow`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `writeResultsMonthToKv()` connect `Result Ingestion Constants` to `Upstash KV Client Configuration`, `KV Sync Pipeline`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `writeResultsMonthToKv()` (e.g. with `isApprovedResultsTag()` and `fetchScheduleGamesForMonth()`) actually correct?**
  _`writeResultsMonthToKv()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Hydrate Final Script`, `Hydrate Hybrid Script`, `Hydrate Master Script` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._