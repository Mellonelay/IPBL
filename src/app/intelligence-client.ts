export type FetchLike = typeof fetch;

export type GenAnalysisSnapshot = {
  source?: string;
  generatedAt?: string;
  bettingRecord?: {
    totalBets?: number;
  };
  worker?: {
    synthesis?: {
      summary?: string;
      fallback?: boolean;
      nextAction?: string;
    };
    storedAt?: string;
  };
  analysisEngine?: AnalysisEngineSnapshot;
  operatorIntelligence?: OperatorIntelligenceSnapshot;
};

export type PredictionRuntimeSnapshot = {
  source?: string;
  generatedAt?: string;
  count?: number;
  summary?: {
    liveStates?: Record<string, number>;
    averageConfidence?: number;
    averageCalibratedConfidence?: number;
    driftState?: string;
  };
};

export type RecorderHealthSnapshot = {
  status?: unknown;
  runRows?: unknown[];
  health?: {
    schemaVersion?: number;
    evaluatedAt?: string;
    level?: string;
    reasons?: string[];
    freshness?: {
      lastCapturedAt?: string | null;
      ageSeconds?: number | null;
      freshWithinSeconds?: number;
      staleAfterSeconds?: number;
      failedAfterSeconds?: number;
    };
    source?: {
      name?: string | null;
      reportedStatus?: string;
      fallbackActive?: boolean;
      fallbackFrom?: string | null;
      requestedDivisions?: number | null;
      successfulDivisions?: number | null;
      coverageRatio?: number;
      upstreamFailureCount?: number;
      upstreamHttpStatuses?: number[];
      unmatchedEventCount?: number;
      bookmakerFailureCount?: number;
      unmatchedByReason?: Record<string, number>;
      receivedBookmakerEvents?: number | null;
      latencyMs?: number | null;
    };
    scheduler?: {
      cadenceSeconds?: number;
      recentRunCount?: number;
      firstRunAt?: string | null;
      lastRunAt?: string | null;
      maxObservedGapSeconds?: number | null;
      okRuns?: number;
      partialRuns?: number;
      failedRuns?: number;
      consecutiveFailedRuns?: number;
      consecutivePartialRuns?: number;
      consecutiveNonFailedRuns?: number;
    };
    alert?: {
      severity?: string;
      shouldNotify?: boolean;
      code?: string;
      incidentStartedAt?: string | null;
      thresholdRuns?: number | null;
      recommendedAction?: string;
    };
    recovery?: {
      state?: string;
      lastFailureAt?: string | null;
      consecutiveNonFailedRuns?: number;
      requiredNonFailedRuns?: number;
    };
    continuity?: {
      preservedActiveGameCount?: number;
      policy?: string;
      activeSetMutationSuppressedOnSourceFail?: boolean;
      preservedActiveGameKeys?: string[];
    };
    storage?: {
      prefix?: string;
      maxSnapshotsPerTimeline?: number;
      perGameTtlSeconds?: number;
      runsMaxEntries?: number;
      runsTtlSeconds?: number | null;
      statusTtlSeconds?: number | null;
      activeSetTtlSeconds?: number | null;
      dedupeFingerprintFields?: string[];
    };
    evidenceLevel?: number;
  };
  activeGameKeys?: string[];
};

export type AnalysisEngineSnapshot = {
  schema?: string;
  status?: string;
  skills?: Array<{ name?: string }>;
};

export type OperatorIntelligenceSnapshot = {
  schema?: string;
  phase?: number;
  status?: string;
  evidence?: {
    recorder?: {
      coverage?: string;
    };
    h2h?: {
      coverage?: string;
    };
    odds?: {
      coverage?: string;
    };
  };
};

export type IntelligenceSurfaceSnapshot = {
  genAnalysis: GenAnalysisSnapshot;
  predictionRuntime: PredictionRuntimeSnapshot;
  recorderHealth: RecorderHealthSnapshot;
  analysisEngine: AnalysisEngineSnapshot;
  operatorIntelligence: OperatorIntelligenceSnapshot;
};

async function fetchJson<T>(url: string, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Intelligence API error: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
}

export async function loadIntelligenceSurface(fetchImpl: FetchLike = fetch): Promise<IntelligenceSurfaceSnapshot> {
  const [genAnalysis, predictionRuntime, recorderHealth] = await Promise.all([
    fetchJson<GenAnalysisSnapshot>("/api/gen-analysis", fetchImpl),
    fetchJson<PredictionRuntimeSnapshot>("/api/predictions/live", fetchImpl),
    fetchJson<RecorderHealthSnapshot>("/api/recorder?mode=health", fetchImpl),
  ]);

  return {
    genAnalysis,
    predictionRuntime,
    recorderHealth,
    analysisEngine: genAnalysis.analysisEngine ?? {},
    operatorIntelligence: genAnalysis.operatorIntelligence ?? {},
  };
}
