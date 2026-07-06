import type { ScheduleGame } from "./calendar-normalize.js";
import { fetchScheduleGamesForDay } from "./ingest-results-month.js";
import { buildIsoDateRange, isoDateTodayInTimeZone, parseIsoDate } from "./results-hardening.js";
import { RESULTS_SYNC_TAGS } from "./results-sync-constants.js";
import { writePreparedResultsMonthToKv, type ResultsMonthWriteResult } from "./write-results-month-kv.js";

export const OFFICIAL_BACKFILL_START = "2026-06-01";

export type OfficialBackfillMonthBucket = {
  year: number;
  month: number;
  divisionTag: string;
  games: ScheduleGame[];
};

export type OfficialBackfillCollection = {
  from: string;
  to: string;
  days: string[];
  buckets: OfficialBackfillMonthBucket[];
};

export type OfficialBackfillDependencies = {
  now?: () => Date;
  timeoutMs?: number;
  fetchDay?: typeof fetchScheduleGamesForDay;
};

export type OfficialBackfillWriteDependencies = OfficialBackfillDependencies & {
  redis?: {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<unknown>;
  };
};

export function buildBackfillDays(fromIso: string, toIso: string): string[] {
  return buildIsoDateRange(fromIso, toIso);
}

function bucketKey(year: number, month: number, divisionTag: string): string {
  return `${year}-${String(month).padStart(2, "0")}:${divisionTag}`;
}

function sortedMonthBuckets(buckets: Map<string, OfficialBackfillMonthBucket>): OfficialBackfillMonthBucket[] {
  return [...buckets.values()].sort((a, b) => {
    return a.year - b.year || a.month - b.month || a.divisionTag.localeCompare(b.divisionTag);
  });
}

export function resolveOfficialBackfillRange(args: {
  from?: string;
  to?: string;
  now?: Date;
} = {}): { from: string; to: string } {
  const from = args.from?.trim() || OFFICIAL_BACKFILL_START;
  const to = args.to?.trim() || isoDateTodayInTimeZone(args.now ?? new Date());
  return { from, to };
}

export async function collectOfficialBackfillBuckets(
  args: {
    from?: string;
    to?: string;
    divisionTags?: readonly string[];
  } = {},
  dependencies: OfficialBackfillDependencies = {}
): Promise<OfficialBackfillCollection> {
  const { from, to } = resolveOfficialBackfillRange({ from: args.from, to: args.to, now: dependencies.now?.() });
  const days = buildBackfillDays(from, to);
  const divisionTags = [...new Set(args.divisionTags ?? RESULTS_SYNC_TAGS)];
  const fetchDay = dependencies.fetchDay ?? fetchScheduleGamesForDay;
  const buckets = new Map<string, OfficialBackfillMonthBucket>();

  for (const day of days) {
    const parsed = parseIsoDate(day);
    if (!parsed) {
      throw new Error(`Invalid backfill day: ${day}`);
    }
    for (const divisionTag of divisionTags) {
      const key = bucketKey(parsed.year, parsed.month, divisionTag);
      if (!buckets.has(key)) {
        buckets.set(key, {
          year: parsed.year,
          month: parsed.month,
          divisionTag,
          games: [],
        });
      }
    }

    const fetched = await Promise.all(
      divisionTags.map(async (divisionTag) => ({
        divisionTag,
        games: await fetchDay(divisionTag, day, { timeoutMs: dependencies.timeoutMs }),
      }))
    );

    for (const { divisionTag, games } of fetched) {
      const parsedMonth = parseIsoDate(day);
      if (!parsedMonth) continue;
      const bucket = buckets.get(bucketKey(parsedMonth.year, parsedMonth.month, divisionTag));
      if (!bucket) continue;
      bucket.games.push(...games);
    }
  }

  return {
    from,
    to,
    days,
    buckets: sortedMonthBuckets(buckets),
  };
}

export async function runOfficialBackfillRange(
  args: {
    from?: string;
    to?: string;
    divisionTags?: readonly string[];
  } = {},
  dependencies: OfficialBackfillWriteDependencies = {}
): Promise<{
  from: string;
  to: string;
  daysFetched: number;
  divisionCount: number;
  monthsWritten: number;
  results: ResultsMonthWriteResult[];
}> {
  const collection = await collectOfficialBackfillBuckets(args, dependencies);
  const results: ResultsMonthWriteResult[] = [];
  for (const bucket of collection.buckets) {
    const result = await writePreparedResultsMonthToKv(
      {
        year: bucket.year,
        month: bucket.month,
        divisionTag: bucket.divisionTag,
        games: bucket.games,
      },
      { redis: dependencies.redis, now: dependencies.now }
    );
    results.push(result);
  }
  return {
    from: collection.from,
    to: collection.to,
    daysFetched: collection.days.length,
    divisionCount: [...new Set(args.divisionTags ?? RESULTS_SYNC_TAGS)].length,
    monthsWritten: results.length,
    results,
  };
}
