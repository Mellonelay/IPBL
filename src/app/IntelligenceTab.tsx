import type { IntelligenceSurfaceSnapshot } from "./intelligence-client";
import { Metric } from "./shared";

function pct(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function count(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "—";
}

function sentence(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function yesNo(value: boolean | undefined): string {
  return typeof value === "boolean" ? (value ? "Yes" : "No") : "—";
}

export type IntelligenceTabProps = {
  snapshot: IntelligenceSurfaceSnapshot | null;
  loading: boolean;
  error: string | null;
};

export default function IntelligenceTab({ snapshot, loading, error }: IntelligenceTabProps) {
  if (error) {
    return (
      <section className="tab-panel">
        <p className="err">{error}</p>
      </section>
    );
  }

  if (loading && !snapshot) {
    return (
      <section className="tab-panel">
        <p className="muted">Loading intelligence surface...</p>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="tab-panel">
        <p className="muted">Intelligence surface is waiting for the first snapshot.</p>
      </section>
    );
  }

  const synthesis = snapshot.genAnalysis.worker?.synthesis;
  const predictionSummary = snapshot.predictionRuntime.summary;
  const recorderHealth = snapshot.recorderHealth.health;
  const operatorEvidence = snapshot.operatorIntelligence.evidence;

  return (
    <section className="tab-panel">
      {loading && <p className="muted">Refreshing intelligence surface...</p>}

      <div className="live-card-grid">
        <article className="operator-card">
          <div className="card-head">
            <div>
              <div className="card-title">Graphify synthesis</div>
              <div className="card-subtitle">
                {sentence(synthesis?.summary, "Graphify summary is available through api/gen-analysis.")}
              </div>
            </div>
            <span className="status-badge">{snapshot.genAnalysis.source ?? "api/gen-analysis"}</span>
          </div>

          <div className="summary-strip">
            <Metric label="Fallback" value={yesNo(synthesis?.fallback)} />
            <Metric label="Next action" value={sentence(synthesis?.nextAction, "—")} />
            <Metric label="Stored at" value={sentence(snapshot.genAnalysis.worker?.storedAt, "—")} />
            <Metric label="Bets" value={count(snapshot.genAnalysis.bettingRecord?.totalBets)} />
          </div>
        </article>

        <article className="operator-card">
          <div className="card-head">
            <div>
              <div className="card-title">Prediction runtime</div>
              <div className="card-subtitle">
                {count(snapshot.predictionRuntime.count)} live prediction row
                {snapshot.predictionRuntime.count === 1 ? "" : "s"} in the runtime envelope.
              </div>
            </div>
            <span className="status-badge">{sentence(predictionSummary?.driftState, "unknown")}</span>
          </div>

          <div className="summary-strip">
            <Metric label="Average confidence" value={pct(predictionSummary?.averageConfidence)} />
            <Metric label="Calibrated confidence" value={pct(predictionSummary?.averageCalibratedConfidence)} />
            <Metric label="Late games" value={count(predictionSummary?.liveStates?.late)} />
            <Metric label="Runtime source" value={sentence(snapshot.predictionRuntime.source, "—")} />
          </div>
        </article>

        <article className="operator-card">
          <div className="card-head">
            <div>
              <div className="card-title">Recorder health</div>
              <div className="card-subtitle">
                {sentence(recorderHealth?.source?.reportedStatus, "Recorder health snapshot loaded")}
              </div>
            </div>
            <span className="status-badge">{sentence(recorderHealth?.level, "unknown")}</span>
          </div>

          <div className="summary-strip">
            <Metric label="Coverage" value={pct(recorderHealth?.source?.coverageRatio)} />
            <Metric label="Unmatched events" value={count(recorderHealth?.source?.unmatchedEventCount)} />
            <Metric label="Active games" value={count(snapshot.recorderHealth.activeGameKeys?.length)} />
            <Metric label="Alert" value={sentence(recorderHealth?.alert?.code, "none")} />
          </div>
        </article>

        <article className="operator-card">
          <div className="card-head">
            <div>
              <div className="card-title">Phase coverage</div>
              <div className="card-subtitle">
                Analysis engine and operator intelligence remain read-only evidence surfaces.
              </div>
            </div>
            <span className="status-badge">Phase {count(snapshot.operatorIntelligence.phase)}</span>
          </div>

          <div className="summary-strip">
            <Metric label="Analysis status" value={sentence(snapshot.analysisEngine.status, "—")} />
            <Metric label="Skills" value={count(snapshot.analysisEngine.skills?.length)} />
            <Metric label="Recorder coverage" value={sentence(operatorEvidence?.recorder?.coverage, "—")} />
            <Metric label="H2H / odds" value={`${sentence(operatorEvidence?.h2h?.coverage, "—")} / ${sentence(operatorEvidence?.odds?.coverage, "—")}`} />
          </div>
        </article>
      </div>
    </section>
  );
}
