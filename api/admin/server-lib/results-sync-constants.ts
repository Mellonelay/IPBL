/**
 * Results sync constants for Vercel serverless under `api/`.
 * Duplicated from `lib/results-constants.ts` so handlers never import `../../lib/*`
 * (see `api/results.ts` â€” root `lib` graph breaks bundling for nested API routes).
 */
export const RESULTS_SYNC_TAGS = [
  "ipbl-66-m-pro-a",
  "ipbl-66-m-pro-b",
  "ipbl-66-m-pro-c",
  "ipbl-66-m-pro-d",
  "ipbl-66-m-pro-g",
  "ipbl-66-m-pro-j",
  "ipbl-66-w-pro-a",
  "ipbl-66-w-pro-b",
  "ipbl-66-w-pro-c", "ipbl-66-w-pro-d", "ipbl-66-w-pro-k",
] as const;

export const RESULTS_LANG = "ru";

export const IPBL_API_BASE = "https://api.ipbl.pro";

export function isApprovedResultsTag(tag: string): tag is (typeof RESULTS_SYNC_TAGS)[number] {
  return (RESULTS_SYNC_TAGS as readonly string[]).includes(tag);
}

export function resultsKvKey(year: number, month1to12: number, divisionTag: string): string {
  const m = String(month1to12).padStart(2, "0");
  return `ipbl:results:${year}:${m}:${divisionTag}`;
}

export const SYNC_CURSOR_KEY = "ipbl:sync:cursor";

/** Duplicated from `src/config/divisions.ts` â€” keep serverless graph free of `src/`. */
const DIVISION_ROWS: { label: string; tag: string }[] = [
  { label: "Pro Men A", tag: "ipbl-66-m-pro-a" },
  { label: "Pro Men B", tag: "ipbl-66-m-pro-b" },
  { label: "Pro Men C", tag: "ipbl-66-m-pro-c" },
  { label: "Pro Men D", tag: "ipbl-66-m-pro-d" },
  { label: "Pro Men G", tag: "ipbl-66-m-pro-g" },
  { label: "Pro Men J", tag: "ipbl-66-m-pro-j" },
  { label: "Pro Women A", tag: "ipbl-66-w-pro-a" },
  { label: "Pro Women B", tag: "ipbl-66-w-pro-b" },
  { label: "Pro Women C", tag: "ipbl-66-w-pro-c" },
];

export const DIVISION_LABEL_BY_TAG = Object.fromEntries(
  DIVISION_ROWS.map((d) => [d.tag, d.label] as const)
) as Record<string, string>;

export function canonicalDivisionLabel(tag: string): string | null {
  return DIVISION_LABEL_BY_TAG[tag] ?? null;
}
