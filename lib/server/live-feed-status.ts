import type { ScheduleGame } from "./calendar-normalize.js";
import type { BookmakerLiveResult } from "./bookmaker-live.js";

type BookmakerSettlement =
  | { ok: true; fallback: BookmakerLiveResult }
  | { ok: false; error: unknown }
  | null;

type OfficialReconciliation = {
  checked: number;
  dropped: number;
  updated: number;
};

export type LiveFeedStatusInput = {
  started: number;
  requestedDivisions: number;
  failures: Array<{ tag: string; error?: string }>;
  bookmakerSettled: BookmakerSettlement;
  officialGames: ScheduleGame[];
  bookmakerGames: ScheduleGame[];
  mergedGames: ScheduleGame[];
  officialReconciliation: OfficialReconciliation;
};

export function classifyBookmakerFallbackFailures(bookmakerSettled: BookmakerSettlement): Array<{ error?: string }> {
  if (!bookmakerSettled) return [];
  if (bookmakerSettled.ok) return bookmakerSettled.fallback.sourceFailures ?? [];
  const error = bookmakerSettled.error as Error & { sourceFailures?: Array<{ error?: string }> };
  return error.sourceFailures ?? [
    { error: bookmakerSettled.error instanceof Error ? bookmakerSettled.error.message : String(bookmakerSettled.error) },
  ];
}

export function buildLiveFeedStatus(input: LiveFeedStatusInput): Record<string, unknown> {
  const fallback = input.bookmakerSettled?.ok ? input.bookmakerSettled.fallback : null;
  const bookmakerGames = input.bookmakerGames;
  const bookmakerFallbackFailures = classifyBookmakerFallbackFailures(input.bookmakerSettled);
  const bookmakerHealthy =
    !input.bookmakerSettled || (input.bookmakerSettled.ok && (fallback?.sourceFailures.length ?? 0) === 0);
  const officialHealthy = input.failures.length === 0;
  const source =
    bookmakerGames.length > 0
      ? "bookmaker:melbet.com+1xbet.com"
      : input.officialGames.length > 0
        ? "official:api1.ipbl.pro"
        : "bookmaker:melbet.com+1xbet.com";
  const status =
    input.mergedGames.length > 0
      ? bookmakerGames.length > 0
        ? bookmakerHealthy
          ? "OK"
          : "PARTIAL"
        : officialHealthy && bookmakerHealthy
          ? "OK"
          : "PARTIAL"
      : input.bookmakerSettled && input.bookmakerSettled.ok && input.bookmakerSettled.fallback.sourceFailures.length === 0
        ? "IDLE"
        : "FAIL";

  return {
    lastSyncAt: new Date().toISOString(),
    status,
    source: input.mergedGames.length > 0 ? source : "none",
    fallbackFrom: input.officialGames.length > 0 ? null : "official:api1.ipbl.pro",
    requestedDivisions: input.requestedDivisions,
    successfulDivisions: input.mergedGames.length > 0 ? new Set(input.mergedGames.map((game) => game.tag)).size : 0,
    failures: input.mergedGames.length > 0 ? input.failures : [...input.failures, ...bookmakerFallbackFailures],
    bookmakerSourceLeagues: fallback?.sourceLeagues ?? [],
    bookmakerSourceFailures: bookmakerFallbackFailures,
    receivedBookmakerEvents: fallback?.receivedEvents ?? 0,
    unmatchedBookmakerEvents: fallback?.unmatched ?? [],
    officialReconciliation: input.officialReconciliation,
    latencyMs: Date.now() - input.started,
    displayTimeZone: "Asia/Yangon",
  };
}
