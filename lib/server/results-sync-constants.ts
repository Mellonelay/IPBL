import { DIVISIONS, DIVISION_LABEL_BY_TAG as APPROVED_DIVISION_LABEL_BY_TAG, LIVE_DIVISION_TAGS } from "../../src/config/divisions.js";

export const RESULTS_SYNC_TAGS = LIVE_DIVISION_TAGS;

export const RESULTS_LANG = "ru";
export const IPBL_API_BASE = "https://worker.mloneslot99.com/ipbl-proxy";

export function isApprovedResultsTag(tag: string): tag is (typeof RESULTS_SYNC_TAGS)[number] {
  return (RESULTS_SYNC_TAGS as readonly string[]).includes(tag);
}

export const DEFAULT_RESULTS_DIVISION_TAG = "ipbl-66-m-pro-a";

export function resultsKvKey(year: number, month1to12: number, divisionTag: string): string {
  return `ipbl:results:${year}:${String(month1to12).padStart(2, "0")}:${divisionTag}`;
}

export const SYNC_CURSOR_KEY = "ipbl:sync:cursor";

export const DIVISION_LABEL_BY_TAG = APPROVED_DIVISION_LABEL_BY_TAG;

export const DIVISION_TAG_BY_LABEL = Object.fromEntries(
  DIVISIONS.map((d) => [d.label.toLowerCase(), d.tag] as const)
) as Record<string, string>;

export function canonicalDivisionLabel(tag: string): string | null {
  return DIVISION_LABEL_BY_TAG[tag] ?? null;
}

export function normalizeResultsDivisionTag(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (isApprovedResultsTag(raw)) return raw;
  return DIVISION_TAG_BY_LABEL[raw.toLowerCase()] ?? null;
}

export function resultsMetadataKey(year: number, month1to12: number, divisionTag: string): string {
  return `${resultsKvKey(year, month1to12, divisionTag)}:meta`;
}

export function resultsSyncTagsForMonth(_year: number, _month1to12: number): readonly string[] {
  return RESULTS_SYNC_TAGS;
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
