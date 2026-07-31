import type { TabKey } from "./app-types";

export type InitialResultsSelection = {
  year: number;
  monthIndex: number;
};

export type InitialRouteState = {
  activeTab: TabKey;
  resultsYear: number;
  resultsMonthIndex: number;
  resultsDivisionTag: string;
  jumpDate: string;
};

const VALID_TABS = new Set<TabKey>([
  "live",
  "results",
  "intelligence",
  "teams",
  "betting",
]);

function validDateParts(value: string | null): [number, number, number] | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = new Date(year, month, 0).getDate();
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > maxDay) return null;
  return [year, month, day];
}

export function resolveInitialRouteState(input: {
  search: string;
  fallbackResults: InitialResultsSelection;
  defaultDivisionTag: string;
  allowedDivisionTags: readonly string[];
}): InitialRouteState {
  const params = new URLSearchParams(input.search);
  const requestedTab = params.get("tab") as TabKey | null;
  const activeTab = requestedTab && VALID_TABS.has(requestedTab) ? requestedTab : "results";
  const dateParts = validDateParts(params.get("date"));
  const resultsYear = dateParts?.[0] ?? input.fallbackResults.year;
  const resultsMonthIndex = dateParts ? dateParts[1] - 1 : input.fallbackResults.monthIndex;
  const fallbackJumpDate = `${resultsYear}-${String(resultsMonthIndex + 1).padStart(2, "0")}-01`;
  const requestedDivision = params.get("division");
  const resultsDivisionTag = requestedDivision && input.allowedDivisionTags.includes(requestedDivision)
    ? requestedDivision
    : input.defaultDivisionTag;

  return {
    activeTab,
    resultsYear,
    resultsMonthIndex,
    resultsDivisionTag,
    jumpDate: dateParts ? params.get("date")! : fallbackJumpDate,
  };
}
