import type { ResultState } from "./result-states";

export type HistoricalDivisionStatus = "source_unverified" | "inactive_or_not_currently_listed" | "active";

export const REQUIRED_HISTORICAL_START = "2026-05-01" as const;
export const REQUIRED_HISTORICAL_END = "2026-06-01" as const;
export const REQUIRED_HISTORICAL_SOURCE = "historical_source_unconfirmed" as const;
export const REQUIRED_HISTORICAL_MESSAGE = "Historical result pending source verification" as const;

export type RequiredHistoricalDivisionTag =
  | "ipbl-66-m-pro-a"
  | "ipbl-66-m-pro-b"
  | "ipbl-66-m-pro-c"
  | "ipbl-66-m-pro-d"
  | "ipbl-66-m-pro-g"
  | "ipbl-66-w-pro-a"
  | "ipbl-66-w-pro-b"
  | "ipbl-66-w-pro-c"
  | "ipbl-66-w-pro-g"
  | "ipbl-66-w-pro-k";

export type RequiredHistoricalDivision = {
  tag: RequiredHistoricalDivisionTag;
  gender: "men" | "women";
  code: "pro-a" | "pro-b" | "pro-c" | "pro-d" | "pro-g" | "pro-k";
  label: string;
  status: HistoricalDivisionStatus;
};

export type HistoricalCoverageState = Extract<ResultState, "historical_unverified" | "pending_backfill" | "source_unavailable">;

export type HistoricalCoverageSlot = {
  date: string;
  division: RequiredHistoricalDivisionTag;
  divisionLabel: string;
  state: HistoricalCoverageState;
  matches: [];
  source: typeof REQUIRED_HISTORICAL_SOURCE;
  message: typeof REQUIRED_HISTORICAL_MESSAGE;
  scoreVerified: false;
  confirmedEmpty: false;
};

export const REQUIRED_HISTORICAL_SELECTED_DIVISIONS: RequiredHistoricalDivision[] = [
  { tag: "ipbl-66-m-pro-a", gender: "men", code: "pro-a", label: "Men Pro A", status: "source_unverified" },
  { tag: "ipbl-66-m-pro-b", gender: "men", code: "pro-b", label: "Men Pro B", status: "source_unverified" },
  { tag: "ipbl-66-m-pro-c", gender: "men", code: "pro-c", label: "Men Pro C", status: "source_unverified" },
  { tag: "ipbl-66-m-pro-d", gender: "men", code: "pro-d", label: "Men Pro D", status: "source_unverified" },
  { tag: "ipbl-66-m-pro-g", gender: "men", code: "pro-g", label: "Men Pro G", status: "source_unverified" },
  { tag: "ipbl-66-w-pro-a", gender: "women", code: "pro-a", label: "Women Pro A", status: "source_unverified" },
  { tag: "ipbl-66-w-pro-b", gender: "women", code: "pro-b", label: "Women Pro B", status: "source_unverified" },
  { tag: "ipbl-66-w-pro-c", gender: "women", code: "pro-c", label: "Women Pro C", status: "source_unverified" },
  { tag: "ipbl-66-w-pro-g", gender: "women", code: "pro-g", label: "Women Pro G", status: "source_unverified" },
  { tag: "ipbl-66-w-pro-k", gender: "women", code: "pro-k", label: "Women Pro K", status: "source_unverified" },
];

const MAY_2026_DATES = Array.from({ length: 31 }, (_value, index) => `2026-05-${String(index + 1).padStart(2, "0")}`);

export const REQUIRED_HISTORICAL_COVERAGE_DATES = [...MAY_2026_DATES, "2026-06-01"] as const;
export const REQUIRED_HISTORICAL_SELECTED_DIVISION_TAGS = REQUIRED_HISTORICAL_SELECTED_DIVISIONS.map((division) => division.tag);
export const REQUIRED_HISTORICAL_EXPECTED_SLOT_COUNT = REQUIRED_HISTORICAL_COVERAGE_DATES.length * REQUIRED_HISTORICAL_SELECTED_DIVISIONS.length;

export function isRequiredHistoricalCoverageDate(date: string): boolean {
  return (REQUIRED_HISTORICAL_COVERAGE_DATES as readonly string[]).includes(date);
}

export function getHistoricalCoverageState(): HistoricalCoverageState {
  return "historical_unverified";
}

export function buildHistoricalCoverageSlot(date: string, divisionTag: RequiredHistoricalDivisionTag): HistoricalCoverageSlot {
  const division = REQUIRED_HISTORICAL_SELECTED_DIVISIONS.find((item) => item.tag === divisionTag);
  if (!division) throw new Error(`Unsupported historical coverage division: ${divisionTag}`);
  return {
    date,
    division: division.tag,
    divisionLabel: division.label,
    state: getHistoricalCoverageState(),
    matches: [],
    source: REQUIRED_HISTORICAL_SOURCE,
    message: REQUIRED_HISTORICAL_MESSAGE,
    scoreVerified: false,
    confirmedEmpty: false,
  };
}

export function buildRequiredHistoricalCoverageSlots(): HistoricalCoverageSlot[] {
  return REQUIRED_HISTORICAL_COVERAGE_DATES.flatMap((date) =>
    REQUIRED_HISTORICAL_SELECTED_DIVISIONS.map((division) => buildHistoricalCoverageSlot(date, division.tag)),
  );
}

export function shouldShowNoMatchesTodayForHistoricalState(state: ResultState): boolean {
  return state === "confirmed_empty";
}

export function describeHistoricalCoverageState(state: HistoricalCoverageState): string {
  if (state === "pending_backfill") return "Historical backfill pending";
  if (state === "source_unavailable") return "Historical source unavailable";
  return REQUIRED_HISTORICAL_MESSAGE;
}
