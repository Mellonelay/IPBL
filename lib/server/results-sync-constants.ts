export const RESULTS_SYNC_TAGS = [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g", "ipbl-66-m-pro-u",
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
