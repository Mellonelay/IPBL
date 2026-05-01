---
type: community
cohesion: 0.15
members: 16
---

# Operator Rule Engine

**Cohesion:** 0.15 - loosely connected
**Members:** 16 nodes

## Members
- [[analyzeQuarterFlow]] - code - src/operator/engine.ts
- [[asRecord]] - code - src/operator/engine.ts
- [[buildInsight]] - code - src/operator/mock.ts
- [[deepFind]] - code - src/operator/engine.ts
- [[demoLiveInsight]] - code - src/operator/mock.ts
- [[demoResultInsight]] - code - src/operator/mock.ts
- [[evaluateOperatorDecision]] - code - src/operator/engine.ts
- [[getHistoricalContext]] - code - src/operator/engine.ts
- [[getPeriodMinutes]] - code - src/operator/engine.ts
- [[getScoreboardAnalysis]] - code - src/operator/engine.ts
- [[matchupKey]] - code - src/operator/engine.ts
- [[normalizeTeam]] - code - src/operator/engine.ts
- [[oddsBand]] - code - src/operator/engine.ts
- [[operatorRules]] - code - src/operator/data.ts
- [[operatorSummary]] - code - src/operator/data.ts
- [[teamFlags]] - code - src/operator/engine.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Operator_Rule_Engine
SORT file.name ASC
```
