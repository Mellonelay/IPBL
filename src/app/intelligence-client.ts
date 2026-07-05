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
  health?: {
    level?: string;
    source?: {
      reportedStatus?: string;
      coverageRatio?: number;
      unmatchedEventCount?: number;
      bookmakerFailureCount?: number;
    };
    alert?: {
      code?: string;
    };
    continuity?: {
      preservedActiveGameCount?: number;
    };
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
  const [genAnalysis, predictionRuntime, recorderHealth, analysisEngine, operatorIntelligence] = await Promise.all([
    fetchJson<GenAnalysisSnapshot>("/api/gen-analysis", fetchImpl),
    fetchJson<PredictionRuntimeSnapshot>("/api/predictions/live", fetchImpl),
    fetchJson<RecorderHealthSnapshot>("/api/recorder?mode=health", fetchImpl),
    fetchJson<AnalysisEngineSnapshot>("/api/analysis-engine", fetchImpl),
    fetchJson<OperatorIntelligenceSnapshot>("/api/operator-intelligence", fetchImpl),
  ]);

  return {
    genAnalysis,
    predictionRuntime,
    recorderHealth,
    analysisEngine,
    operatorIntelligence,
  };
}
