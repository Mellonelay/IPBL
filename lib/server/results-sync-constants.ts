export const RESULTS_SYNC_TAGS = [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g", "ipbl-66-m-pro-u", "ipbl-66-m-pro-z", "ipbl-66-m-pro-l",
  "ipbl-66-w-pro-a", "ipbl-66-w-pro-b", "ipbl-66-w-pro-c", "ipbl-66-w-pro-d",
  "ipbl-66-w-pro-g", "ipbl-66-w-pro-k",
] as const;

export const RESULTS_LANG = "ru";
export const IPBL_API_BASE = "https://worker.mloneslot99.com/ipbl-proxy";

export function isApprovedResultsTag(tag: string): tag is (typeof RESULTS_SYNC_TAGS)[number] {
  return (RESULTS_SYNC_TAGS as readonly string[]).includes(tag);
}

export function resultsKvKey(year: number, month1to12: number, divisionTag: string): string {
  return `ipbl:results:${year}:${String(month1to12).padStart(2, "0")}:${divisionTag}`;
}

export const SYNC_CURSOR_KEY = "ipbl:sync:cursor";

const DIVISION_ROWS: { label: string; tag: string }[] = [
  { label: "Pro Men A", tag: "ipbl-66-m-pro-a" },
  { label: "Pro Men B", tag: "ipbl-66-m-pro-b" },
  { label: "Pro Men C", tag: "ipbl-66-m-pro-c" },
  { label: "Pro Men D", tag: "ipbl-66-m-pro-d" },
  { label: "Pro Men G", tag: "ipbl-66-m-pro-g" },
  { label: "Pro Men U", tag: "ipbl-66-m-pro-u" },
  { label: "Pro Men Z", tag: "ipbl-66-m-pro-z" },
  { label: "Pro Men L", tag: "ipbl-66-m-pro-l" },
  { label: "Pro Women A", tag: "ipbl-66-w-pro-a" },
  { label: "Pro Women B", tag: "ipbl-66-w-pro-b" },
  { label: "Pro Women C", tag: "ipbl-66-w-pro-c" },
  { label: "Pro Women D", tag: "ipbl-66-w-pro-d" },
  { label: "Pro Women G", tag: "ipbl-66-w-pro-g" },
  { label: "Pro Women K", tag: "ipbl-66-w-pro-k" },
];

export const DIVISION_LABEL_BY_TAG = Object.fromEntries(
  DIVISION_ROWS.map((d) => [d.tag, d.label] as const)
) as Record<string, string>;

export function canonicalDivisionLabel(tag: string): string | null {
  return DIVISION_LABEL_BY_TAG[tag] ?? null;
}

export function resultsMetadataKey(year: number, month1to12: number, divisionTag: string): string {
  return `${resultsKvKey(year, month1to12, divisionTag)}:meta`;
}

export function resultsSyncTagsForMonth(year: number, month1to12: number): readonly string[] {
  const legacyMenGActive = year < 2026 || (year === 2026 && month1to12 <= 5);
  return legacyMenGActive
    ? RESULTS_SYNC_TAGS
    : RESULTS_SYNC_TAGS.filter((tag) => tag !== "ipbl-66-m-pro-g");
}

function myanmarYearMonth(now: Date): { year: number; month: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Yangon",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value])
  );
  return { year: Number(parts.year), month: Number(parts.month) };
}

export function resultsSyncSlots(now = new Date()): Array<{ year: number; month: number; tag: string }> {
  const current = myanmarYearMonth(now);
  const previous = current.month === 1
    ? { year: current.year - 1, month: 12 }
    : { year: current.year, month: current.month - 1 };
  return [current, previous].flatMap(({ year, month }) =>
    resultsSyncTagsForMonth(year, month).map((tag) => ({ year, month, tag }))
  );
}
