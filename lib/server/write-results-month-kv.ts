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
import type { ResultsMonthMetadata, StoredResultsMonthMap } from "./results-types.js";

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

export type PreparedResultsMonthWriteParams = {
  year: number;
  /** 1–12 */
  month: number;
  divisionTag: string;
  games: Awaited<ReturnType<typeof fetchScheduleGamesForMonth>>;
  existing?: StoredResultsMonthMap | null;
};

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 240);
}

async function readExistingMonthState(
  client: RedisLike,
  year: number,
  month: number,
  divisionTag: string
): Promise<{ existing: StoredResultsMonthMap | null; priorMetadata: ResultsMonthMetadata | null }> {
  const [existingRaw, priorMetadataRaw] = await Promise.all([
    client.get<unknown>(resultsKvKey(year, month, divisionTag)),
    client.get<unknown>(resultsMetadataKey(year, month, divisionTag)),
  ]);
  const existing = parseStoredResultsMonth(existingRaw);
  const priorMetadata = parseResultsMetadata(priorMetadataRaw)
    ?? (existing ? legacyResultsMetadata({ map: existing, year, month, divisionTag }) : null);
  return { existing, priorMetadata };
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
  if (!Number.isInteger(params.year) || !Number.isInteger(params.month) || params.month < 1 || params.month > 12) {
    throw new Error(`Invalid results month: ${params.year}-${params.month}`);
  }
  if (!isApprovedResultsTag(params.divisionTag) || !resultsSyncTagsForMonth(params.year, params.month).includes(params.divisionTag)) {
    throw new Error(`Unknown or disallowed division tag for ${params.year}-${params.month}: ${params.divisionTag}`);
  }

  const client = dependencies.redis ?? (requireResultsRedis() as unknown as RedisLike);
  const { existing, priorMetadata } = await readExistingMonthState(client, params.year, params.month, params.divisionTag);
  const fetchMonth = dependencies.fetchMonth ?? fetchScheduleGamesForMonth;
  try {
    const games = await fetchMonth(params.divisionTag, params.year, params.month - 1, { timeoutMs: params.timeoutMs });
    return writePreparedResultsMonthToKv(
      { ...params, games, existing },
      { redis: client, now: dependencies.now }
    );
  } catch (error) {
    const checkedAt = (dependencies.now ?? (() => new Date()))().toISOString();
    const failureMetadata: ResultsMonthMetadata = {
      schemaVersion: 1,
      status: "source_unavailable",
      source: RESULTS_SOURCE,
      checkedAt,
      updatedAt: priorMetadata?.updatedAt ?? null,
      verifiedThroughDate: priorMetadata?.verifiedThroughDate ?? null,
      year: params.year,
      month: params.month,
      divisionTag: params.divisionTag,
      error: safeError(error),
    };
    await client.set(resultsMetadataKey(params.year, params.month, params.divisionTag), JSON.stringify(failureMetadata));
    throw error;
  }
}

export async function writePreparedResultsMonthToKv(
  params: PreparedResultsMonthWriteParams,
  dependencies: Omit<WriterDependencies, "fetchMonth"> = {}
): Promise<ResultsMonthWriteResult> {
  const { year, month, divisionTag } = params;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid results month: ${year}-${month}`);
  }
  if (!isApprovedResultsTag(divisionTag) || !resultsSyncTagsForMonth(year, month).includes(divisionTag)) {
    throw new Error(`Unknown or disallowed division tag for ${year}-${month}: ${divisionTag}`);
  }

  const label = DIVISION_LABEL_BY_TAG[divisionTag] ?? divisionTag;
  const client = dependencies.redis ?? (requireResultsRedis() as unknown as RedisLike);
  const now = dependencies.now ?? (() => new Date());
  const key = resultsKvKey(year, month, divisionTag);
  const metadataKey = resultsMetadataKey(year, month, divisionTag);
  const existing = params.existing === undefined
    ? await client.get<unknown>(key).then(parseStoredResultsMonth)
    : params.existing;
  const built = buildStoredMonthMapWithStats(params.games, year, month - 1, divisionTag, label);
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
    gamesIngested: params.games.length,
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
