function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) throw new Error(message ?? `Expected ${String(expected)} but received ${String(actual)}`);
}

import { loadedResultState, shouldShowNoMatchesToday, sourceUnavailableResultState, historicalUnverifiedResultState, confirmedEmptyResultState } from "../../src/results/result-states.ts";

for (const count of [0, 1, 4, 6, 8, 9]) {
  const matches = Array.from({ length: count }, (_, index) => ({ id: index + 1 }));
  const state = loadedResultState({ divisionId: "ipbl-66-m-pro-a", date: "2026-06-02", matches, source: "fixture" });
  assertEqual(state.matches.length, count);
  assertEqual(shouldShowNoMatchesToday(state), false, "loaded empty arrays are not enough to show No matches today");
}

assertEqual(shouldShowNoMatchesToday(confirmedEmptyResultState({ divisionId: "ipbl-66-m-pro-a", date: "2026-06-02", source: "fixture" })), true);
assertEqual(shouldShowNoMatchesToday(sourceUnavailableResultState("ipbl-66-m-pro-a", "2026-06-02", "timeout")), false);
assertEqual(shouldShowNoMatchesToday(historicalUnverifiedResultState("ipbl-66-m-pro-a", "2026-05-01")), false);
