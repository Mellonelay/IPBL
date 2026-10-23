# Bolt's Performance Journal

Critical learnings and performance findings for this codebase.

## 2026-10-23 - Memoizing ResultsCalendarGrid Day Blocks
**Learning:** In ResultsCalendarGrid, rendering 30-31 day blocks causes re-calculation of result states, array filtering/flatMapping, and DOM reconciliations on every jump date typing or parent state update. Memoizing `ResultsDayBlock` with `memo` skips re-rendering unchanged day blocks.
**Action:** Extract day blocks into `memo` components and pass stable props or primitive values.
