export type DivisionGroup = "men" | "women";

export type DivisionConfig = {
    label: string;
    tag: string;
    group: DivisionGroup;
};

export const LIVE_DIVISION_TAGS = [
    "ipbl-66-m-pro-a",
    "ipbl-66-m-pro-b",
    "ipbl-66-m-pro-c",
    "ipbl-66-m-pro-d",
    "ipbl-66-m-pro-g",
    "ipbl-66-w-pro-a",
    "ipbl-66-w-pro-b",
    "ipbl-66-w-pro-c",
    "ipbl-66-w-pro-d",
    "ipbl-66-w-pro-k",
] as const;

export const DIVISIONS: DivisionConfig[] = [
    { label: "Pro Men A", tag: "ipbl-66-m-pro-a", group: "men" },
    { label: "Pro Men B", tag: "ipbl-66-m-pro-b", group: "men" },
    { label: "Pro Men C", tag: "ipbl-66-m-pro-c", group: "men" },
    { label: "Pro Men D", tag: "ipbl-66-m-pro-d", group: "men" },
    { label: "Pro Men G", tag: "ipbl-66-m-pro-g", group: "men" },
    { label: "Pro Women A", tag: "ipbl-66-w-pro-a", group: "women" },
    { label: "Pro Women B", tag: "ipbl-66-w-pro-b", group: "women" },
    { label: "Pro Women C", tag: "ipbl-66-w-pro-c", group: "women" },
    { label: "Pro Women D", tag: "ipbl-66-w-pro-d", group: "women" },
    { label: "Pro Women K", tag: "ipbl-66-w-pro-k", group: "women" },
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

export const LANG = "ru";
