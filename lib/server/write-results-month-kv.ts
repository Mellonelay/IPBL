import { buildStoredMonthMapWithStats, fetchScheduleGamesForMonth } from "./ingest-results-month.js";
import {
  legacyResultsMetadata,
  mergeStoredResultsMonths,
  parseResultsMetadata,
  parseStoredResultsMonth,
  verifiedThroughDateForMonth,
} from "./results-hardening.js";
import {
  DIVISION_LABEL_BY_TAG,
  isApprovedResultsTag,
  resultsKvKey,
  resultsMetadataKey,
  resultsSyncTagsForMonth,
} from "./results-sync-constants.js";
import { requireResultsRedis } from "./results-redis.js";
import type { ResultsMonthMetadata } from "./results-types.js";

const RESULTS_SOURCE = "official:api1.ipbl.pro via worker";

type RedisLike = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
};

type WriterDependencies = {
  redis?: RedisLike;
  fetchMonth?: typeof fetchScheduleGamesForMonth;
  now?: () => Date;
};

export type ResultsMonthWriteResult = {
  key: string;
  metadataKey: string;
  gamesIngested: number;
  gamesAccepted: number;
  gamesMerged: number;
  gamesPreserved: number;
  rejectedNonFinished: number;
  duplicatesCollapsed: number;
  partialPeriodRows: number;
  quarantinedPeriodRows: number;
  divisionTag: string;
  metadata: ResultsMonthMetadata;
};

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 240);
}

export async function writeResultsMonthToKv(
  params: {
    year: number;
    /** 1–12 */
    month: number;
    divisionTag: string;
    timeoutMs?: number;
  },
  dependencies: WriterDependencies = {}
): Promise<ResultsMonthWriteResult> {
  const { year, month, divisionTag } = params;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid results month: ${year}-${month}`);
  }
  if (!isApprovedResultsTag(divisionTag) || !resultsSyncTagsForMonth(year, month).includes(divisionTag)) {
    throw new Error(`Unknown or disallowed division tag for ${year}-${month}: ${divisionTag}`);
  }

  const label = DIVISION_LABEL_BY_TAG[divisionTag] ?? divisionTag;
  const timeoutMs = params.timeoutMs ?? Number.parseInt(process.env.SYNC_MONTH_TIMEOUT_MS ?? "115000", 10);
  const client = dependencies.redis ?? (requireResultsRedis() as unknown as RedisLike);
  const fetchMonth = dependencies.fetchMonth ?? fetchScheduleGamesForMonth;
  const now = dependencies.now ?? (() => new Date());
  const key = resultsKvKey(year, month, divisionTag);
  const metadataKey = resultsMetadataKey(year, month, divisionTag);
  const [existingRaw, priorMetadataRaw] = await Promise.all([
    client.get<unknown>(key),
    client.get<unknown>(metadataKey),
  ]);
  const existing = parseStoredResultsMonth(existingRaw);
  const priorMetadata = parseResultsMetadata(priorMetadataRaw)
    ?? (existing ? legacyResultsMetadata({ map: existing, year, month, divisionTag }) : null);

  let games;
  try {
    games = await fetchMonth(divisionTag, year, month - 1, { timeoutMs });
  } catch (error) {
    const checkedAt = now().toISOString();
    const failureMetadata: ResultsMonthMetadata = {
      schemaVersion: 1,
      status: "source_unavailable",
      source: RESULTS_SOURCE,
      checkedAt,
      updatedAt: priorMetadata?.updatedAt ?? null,
      verifiedThroughDate: priorMetadata?.verifiedThroughDate ?? null,
      year,
      month,
      divisionTag,
      error: safeError(error),
    };
    await client.set(metadataKey, JSON.stringify(failureMetadata));
    throw error;
  }

  const built = buildStoredMonthMapWithStats(games, year, month - 1, divisionTag, label);
  const merged = mergeStoredResultsMonths(existing, built.map);
  const completedAt = now();
  const timestamp = completedAt.toISOString();
  const metadata: ResultsMonthMetadata = {
    schemaVersion: 1,
    status: "ok",
    source: RESULTS_SOURCE,
    checkedAt: timestamp,
    updatedAt: timestamp,
    verifiedThroughDate: verifiedThroughDateForMonth(year, month, completedAt),
    year,
    month,
    divisionTag,
    fetchedRows: built.stats.fetchedRows,
    acceptedRows: built.stats.acceptedRows,
    mergedRows: merged.stats.mergedRows,
    preservedRows: merged.stats.preservedRows,
    rejectedNonFinished: built.stats.rejectedNonFinished,
    duplicatesCollapsed: built.stats.duplicatesCollapsed,
    partialPeriodRows: built.stats.partialPeriodRows,
    quarantinedPeriodRows: built.stats.quarantinedPeriodRows,
  };

  await client.set(key, JSON.stringify(merged.map));
  await client.set(metadataKey, JSON.stringify(metadata));

  return {
    key,
    metadataKey,
    gamesIngested: games.length,
    gamesAccepted: built.stats.acceptedRows,
    gamesMerged: merged.stats.mergedRows,
    gamesPreserved: merged.stats.preservedRows,
    rejectedNonFinished: built.stats.rejectedNonFinished,
    duplicatesCollapsed: built.stats.duplicatesCollapsed,
    partialPeriodRows: built.stats.partialPeriodRows,
    quarantinedPeriodRows: built.stats.quarantinedPeriodRows,
    divisionTag,
    metadata,
  };
}
