export type DivisionGender = "men" | "women";

export type WatchlistDivisionStatus =
  | "active"
  | "inactive_or_not_currently_listed"
  | "source_unverified";

export type WatchlistDivision = {
  id: string;
  gender: DivisionGender;
  division: string;
  displayLabel: string;
  userWatchlist: true;
  supported: true;
  sourceAliases: ReadonlyArray<string>;
  defaultStatus: WatchlistDivisionStatus;
  historicalBackfillEnabled: false;
};

export const USER_BETTING_WATCHLIST = [
  { id: "ipbl-66-m-pro-a", gender: "men", division: "Pro A", displayLabel: "Men Pro A", userWatchlist: true, supported: true, sourceAliases: ["IPBL Pro A", "Pro A", "Men Pro A", "Pro Men A"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-m-pro-b", gender: "men", division: "Pro B", displayLabel: "Men Pro B", userWatchlist: true, supported: true, sourceAliases: ["IPBL Pro B", "Pro B", "Men Pro B", "Pro Men B"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-m-pro-c", gender: "men", division: "Pro C", displayLabel: "Men Pro C", userWatchlist: true, supported: true, sourceAliases: ["IPBL Pro C", "Pro C", "Men Pro C", "Pro Men C"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-m-pro-d", gender: "men", division: "Pro D", displayLabel: "Men Pro D", userWatchlist: true, supported: true, sourceAliases: ["IPBL Pro D", "Pro D", "Men Pro D", "Pro Men D"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-m-pro-g", gender: "men", division: "Pro G", displayLabel: "Men Pro G", userWatchlist: true, supported: true, sourceAliases: ["IPBL Pro G", "Pro G", "Men Pro G", "Pro Men G"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-w-pro-a", gender: "women", division: "Pro A", displayLabel: "Women Pro A", userWatchlist: true, supported: true, sourceAliases: ["Women Pro A", "Women IPBL Pro A", "IPBL Women Pro A", "Pro Women A"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-w-pro-b", gender: "women", division: "Pro B", displayLabel: "Women Pro B", userWatchlist: true, supported: true, sourceAliases: ["Women Pro B", "Women IPBL Pro B", "IPBL Women Pro B", "Pro Women B"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-w-pro-c", gender: "women", division: "Pro C", displayLabel: "Women Pro C", userWatchlist: true, supported: true, sourceAliases: ["Women Pro C", "Women IPBL Pro C", "IPBL Women Pro C", "Pro Women C"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-w-pro-g", gender: "women", division: "Pro G", displayLabel: "Women Pro G", userWatchlist: true, supported: true, sourceAliases: ["Women Pro G", "Women IPBL Pro G", "IPBL Women Pro G", "Pro G Women", "Pro Women G"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
  { id: "ipbl-66-w-pro-k", gender: "women", division: "Pro K", displayLabel: "Women Pro K", userWatchlist: true, supported: true, sourceAliases: ["Women Pro K", "Women IPBL Pro K", "IPBL Women Pro K", "Pro K Women", "Pro Women K"], defaultStatus: "source_unverified", historicalBackfillEnabled: false },
] as const;

export type ResultsDivisionTag = typeof USER_BETTING_WATCHLIST[number]["id"];

export const WATCHLIST_DIVISION_IDS = USER_BETTING_WATCHLIST.map((division) => division.id);

export const WATCHLIST_DIVISION_BY_ID = USER_BETTING_WATCHLIST.reduce((acc, division) => {
  acc[division.id] = division;
  return acc;
}, {} as Record<ResultsDivisionTag, typeof USER_BETTING_WATCHLIST[number]>);

export function isWatchlistDivisionTag(tag: string): tag is ResultsDivisionTag {
  return Object.prototype.hasOwnProperty.call(WATCHLIST_DIVISION_BY_ID, tag);
}

export function canonicalDivisionLabel(tag: string): string | null {
  return isWatchlistDivisionTag(tag) ? WATCHLIST_DIVISION_BY_ID[tag].displayLabel : null;
}
