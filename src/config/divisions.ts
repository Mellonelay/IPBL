export type DivisionGroup = "men" | "women";

export type DivisionConfig = {
    label: string;
    tag: string;
    group: DivisionGroup;
    validFrom?: string; // YYYY-MM-DD, inclusive
    validTo?: string;   // YYYY-MM-DD, inclusive
};

/** Current official Live divisions. Historical-only Men G is intentionally excluded. */
export const LIVE_DIVISION_TAGS = [
    "ipbl-66-m-pro-a",
    "ipbl-66-m-pro-b",
    "ipbl-66-m-pro-c",
    "ipbl-66-m-pro-d",
    "ipbl-66-m-pro-u",
    "ipbl-66-w-pro-a",
    "ipbl-66-w-pro-b",
    "ipbl-66-w-pro-c",
    "ipbl-66-w-pro-d",
    "ipbl-66-w-pro-g",
    "ipbl-66-w-pro-k",
] as const;

/**
 * Historical + current registry. Validity dates come from saved official daily fixtures.
 * May 2026 intentionally exposes both Men G and Men U because the format changed mid-month.
 */
export const DIVISIONS: DivisionConfig[] = [
    { label: "Pro Men A", tag: "ipbl-66-m-pro-a", group: "men" },
    { label: "Pro Men B", tag: "ipbl-66-m-pro-b", group: "men" },
    { label: "Pro Men C", tag: "ipbl-66-m-pro-c", group: "men" },
    { label: "Pro Men D", tag: "ipbl-66-m-pro-d", group: "men" },
    { label: "Pro Men G", tag: "ipbl-66-m-pro-g", group: "men", validTo: "2026-05-19" },
    { label: "Pro Men U", tag: "ipbl-66-m-pro-u", group: "men", validFrom: "2026-05-26" },
    { label: "Pro Women A", tag: "ipbl-66-w-pro-a", group: "women" },
    { label: "Pro Women B", tag: "ipbl-66-w-pro-b", group: "women" },
    { label: "Pro Women C", tag: "ipbl-66-w-pro-c", group: "women" },
    { label: "Pro Women D", tag: "ipbl-66-w-pro-d", group: "women", validFrom: "2026-04-01" },
    { label: "Pro Women G", tag: "ipbl-66-w-pro-g", group: "women", validFrom: "2026-05-02" },
    { label: "Pro Women K", tag: "ipbl-66-w-pro-k", group: "women", validFrom: "2026-04-01" },
];

export const DIVISION_LABEL_BY_TAG = Object.fromEntries(
    DIVISIONS.map((division) => [division.tag, division.label] as const)
) as Record<string, string>;

export function canonicalDivisionLabel(tag: string): string | null {
    return DIVISION_LABEL_BY_TAG[tag] ?? null;
}

export const LIVE_DIVISIONS = DIVISIONS.filter((division) =>
    LIVE_DIVISION_TAGS.includes(division.tag as (typeof LIVE_DIVISION_TAGS)[number])
);

function monthBounds(year: number, monthIndex: number): { start: string; end: string } {
    const month = String(monthIndex + 1).padStart(2, "0");
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return {
        start: `${year}-${month}-01`,
        end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    };
}

export function divisionActiveInMonth(division: DivisionConfig, year: number, monthIndex: number): boolean {
    const { start, end } = monthBounds(year, monthIndex);
    if (division.validFrom && division.validFrom > end) return false;
    if (division.validTo && division.validTo < start) return false;
    return true;
}

export function divisionsForResultsMonth(year: number, monthIndex: number): DivisionConfig[] {
    return DIVISIONS.filter((division) => divisionActiveInMonth(division, year, monthIndex));
}

export const LANG = "ru";
