import { canonicalDivisionLabel } from "../config/divisions";
import { operatorSummary } from "../operator/data";
import type { DrawerState } from "./app-types";
import {
  Metric,
  currentOrNextQuarter,
  formatCurrency,
  formatPct,
  gameDivision,
  statusTone,
} from "./shared";

export type GameDrawerProps = {
  drawer: DrawerState;
  onClose: () => void;
  onOpenIntelligence: () => void;
};

export default function GameDrawer({ drawer, onClose, onOpenIntelligence }: GameDrawerProps) {
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer" data-testid="game-drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close-btn" onClick={onClose}>
          Close
        </button>

        <section className="drawer-section drawer-hero">
          <div className="drawer-head">
            <div>
              <h2>
                {drawer.game.team1.shortName} vs {drawer.game.team2.shortName}
              </h2>
              <div className="muted">
                {canonicalDivisionLabel(drawer.game.tag) ?? drawer.game.divisionLabel ?? drawer.game.tag} · {drawer.game.localDate} {drawer.game.localTime} Myanmar
              </div>
            </div>
            <span className={`status-badge ${drawer.game.isLive ? "status-online" : "status-finished"}`}>
              {drawer.game.statusDisplay}
            </span>
          </div>
        </section>

        <div className="drawer-lead-grid">
          <section className="drawer-section drawer-h2h-panel">
            <div className="drawer-section-head">
              <h3>H2H block</h3>
              <span className="status-badge">
                {drawer.h2hStatus.state === "loading"
                  ? "Loading"
                  : drawer.h2hStatus.state === "unavailable"
                    ? "Unavailable"
                    : drawer.h2hStatus.state === "partial"
                      ? "Partial"
                      : "Verified"}
              </span>
            </div>
            <p className="muted">
              {drawer.game.team1.shortName} vs {drawer.game.team2.shortName}
              {drawer.h2hStatus.source ? ` · ${drawer.h2hStatus.source}` : ""}
            </p>
            {drawer.h2hStatus.state === "loading" ? (
              <p className="muted">Loading verified matchup history…</p>
            ) : drawer.h2hStatus.state === "unavailable" ? (
              <p className="err">
                {drawer.h2hStatus.error ?? "H2H history is temporarily unavailable."} No zero-meeting conclusion was inferred.
              </p>
            ) : drawer.h2hStatus.state === "partial" && drawer.h2h.length === 0 ? (
              <p className="muted">
                No matchup rows were returned by the responding sources. Coverage is partial, so no zero-meeting conclusion was inferred.
              </p>
            ) : drawer.h2h.length > 0 ? (
              <>
                {drawer.h2hStatus.state === "partial" && (
                  <p className="muted">Showing verified rows from the sources that responded. Coverage is partial.</p>
                )}
                <div className="h2h-list">
                  {drawer.h2h.map((entry) => (
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
          </section>

          <section className="drawer-section">
            <h3>Score block</h3>
            <div className="score-hero">{drawer.game.scoreText}</div>
            <div className="quarter-grid">
              <Metric label="Q1" value={drawer.board.quarterTotals.Q1 ?? "—"} />
              <Metric label="Q2" value={drawer.board.quarterTotals.Q2 ?? "—"} />
              <Metric label="Q3" value={drawer.board.quarterTotals.Q3 ?? "—"} />
              <Metric label="Q4" value={drawer.board.quarterTotals.Q4 ?? "—"} />
              <Metric label="1H" value={drawer.board.firstHalfTotal ?? "—"} />
              <Metric label="2H" value={drawer.board.secondHalfTotal ?? "—"} />
            </div>
          </section>
        </div>

        <section className="drawer-section" data-testid="player-stats-availability">
          <h3>Player statistics</h3>
          <p className="muted">
            Player-level box-score statistics are unavailable in the verified stored Results data. Only confirmed game
            scores and period totals are shown.
          </p>
        </section>

        <section className="drawer-section">
          <h3>Live decision block</h3>
          <div className={`decision-banner ${statusTone(drawer.decision.decision)}`}>{drawer.decision.decision}</div>
          <div className="decision-meta">
            <Metric label="Suggested bias" value={drawer.decision.suggestedBias ?? "No bias"} />
            <Metric label="Pace trend" value={drawer.flow?.paceTrend ?? "UNKNOWN"} />
            <Metric label="Q1 points" value={drawer.flow?.q1Points ?? "—"} />
            <Metric label="Q2 points" value={drawer.flow?.q2Points ?? "—"} />
          </div>
          <p className="muted strong-line">Flow signal: {drawer.flow?.signal ?? "No live quarter signal"}</p>
          <ul className="reason-list">
            {drawer.decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section className="drawer-section">
          <div className="drawer-section-head">
            <h3>Historical risk summary</h3>
            <span className="status-badge">Compact</span>
          </div>
          <div className="quarter-grid">
            <Metric
              label={`Quarter ${currentOrNextQuarter(drawer.flow, drawer.board) ?? "—"}`}
              value={
                drawer.decision.quarterContext
                  ? `${formatPct(drawer.decision.quarterContext.win_rate)} / ${formatCurrency(
                      drawer.decision.quarterContext.net_profit
                    )}`
                  : "No quarter context"
              }
            />
            <Metric
              label={`${gameDivision(drawer.game)} context`}
              value={`${formatPct(drawer.decision.divisionContext?.win_rate ?? 0)} / ${formatCurrency(
                drawer.decision.divisionContext?.net_profit ?? 0
              )}`}
            />
            <Metric
              label="Odds band"
              value={
                drawer.decision.oddsContext
                  ? `${formatPct(drawer.decision.oddsContext.win_rate)} / ${formatCurrency(
                      drawer.decision.oddsContext.net_profit
                    )}`
                  : "No odds context"
              }
            />
          </div>
          <p className="muted">{operatorSummary.theory_call}</p>
        </section>

        <section className="drawer-section drawer-handoff">
          <div className="drawer-section-head">
            <h3>Intelligence handoff</h3>
            <span className="status-badge">Detail</span>
          </div>
          <p className="muted">
            Detailed replay, team-risk, and matchup-risk review now lives in the Intelligence tab.
          </p>
          <button type="button" className="mini-btn" onClick={onOpenIntelligence}>
            Open Intelligence
          </button>
        </section>
      </aside>
    </div>
  );
}
