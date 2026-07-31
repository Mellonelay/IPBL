import type { IntelligenceSurfaceSnapshot } from "./intelligence-client";
import type { IntelligenceFocus } from "./app-types";
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
  focus?: IntelligenceFocus | null;
};

export default function IntelligenceTab({ snapshot, loading, error, focus }: IntelligenceTabProps) {
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

      {focus && (
        <article className="operator-card">
          <div className="card-head">
            <div>
              <div className="card-title">H2H evidence</div>
              <div className="card-subtitle">
                {focus.game.team1.shortName} vs {focus.game.team2.shortName} with quarter splits carried inline.
              </div>
            </div>
            <span className="status-badge">
              {focus.h2hStatus.state === "loading"
                ? "Loading"
                : focus.h2hStatus.state === "unavailable"
                  ? "Unavailable"
                  : focus.h2hStatus.state === "partial"
                    ? "Partial"
                    : `${focus.h2h.length} verified row${focus.h2h.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {focus.h2hStatus.source && <p className="muted">Evidence source: {focus.h2hStatus.source}</p>}
          {focus.h2hStatus.state === "loading" ? (
            <p className="muted">Loading verified matchup history…</p>
          ) : focus.h2hStatus.state === "unavailable" ? (
            <p className="err">
              {focus.h2hStatus.error ?? "H2H history is temporarily unavailable."} No zero-meeting conclusion was inferred.
            </p>
          ) : focus.h2hStatus.state === "partial" && focus.h2h.length === 0 ? (
            <p className="muted">
              No matchup rows were returned by the responding sources. Coverage is partial, so no zero-meeting conclusion was inferred.
            </p>
          ) : focus.h2h.length > 0 ? (
            <>
              {focus.h2hStatus.state === "partial" && (
                <p className="muted">Coverage is partial; only verified responding sources are shown.</p>
              )}
              <div className="h2h-list">
                {focus.h2h.map((entry) => (
                  <article className="h2h-item" key={entry.gameId}>
                    <div className="replay-item-head">
                      <strong>{entry.date} {entry.time}</strong>
                      <span className="calendar-division-badge">{entry.status}</span>
                    </div>
                    <div className="drawer-h2h-score">{entry.scoreText}</div>
                    {entry.quarterTotals && <div className="calendar-quarter-line">{entry.quarterTotals}</div>}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">No verified prior meetings were found in the available sources.</p>
          )}
        </article>
      )}

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
