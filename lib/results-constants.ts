/**
 * Approved results divisions — server + client must match.
 * Alias `RESULTS_DIVISION_TAGS` in client code for historical naming.
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
    "ipbl-66-w-pro-c",
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
