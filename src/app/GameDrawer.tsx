import { canonicalDivisionLabel } from "../config/divisions";
import { matchupKey, parseH2HQuarterMatrix } from "../operator/engine";
import { operatorSummary } from "../operator/data";
import type { DrawerState } from "./app-types";
import {
  Metric,
  currentOrNextQuarter,
  formatCurrency,
  formatPct,
  gameDivision,
  replayEventSummary,
  statusTone,
} from "./shared";

export type GameDrawerProps = {
  drawer: DrawerState;
  onClose: () => void;
};

export default function GameDrawer({ drawer, onClose }: GameDrawerProps) {
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer" data-testid="game-drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close-btn" onClick={onClose}>
          Close
        </button>

        <section className="drawer-section">
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
          <h3>Historical risk block</h3>
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

        <section className="drawer-section" data-testid="odds-replay-section">
          <h3>Odds movement</h3>
          {drawer.replayLoading && (
            <p className="muted" data-testid="odds-replay-loading">
              Loading odds replay...
            </p>
          )}
          {!drawer.replayLoading && drawer.replayErr && (
            <p className="err" data-testid="odds-replay-error">
              {drawer.replayErr}
            </p>
          )}
          {!drawer.replayLoading && !drawer.replayErr && !drawer.replay && (
            <p className="muted" data-testid="odds-replay-empty">
              No stored odds replay available for this game.
            </p>
          )}
          {!drawer.replayLoading && drawer.replay && (
            <>
              <div className="quarter-grid" data-testid="odds-replay-summary">
                <Metric label="Replay events" value={drawer.replay.timeline.length} />
                <Metric
                  label="Odds snapshots"
                  value={drawer.replay.timeline.filter((event) => event.kind === "odds").length}
                />
                <Metric
                  label="Quarter snapshots"
                  value={drawer.replay.timeline.filter((event) => event.kind === "quarter").length}
                />
                <Metric
                  label="Result snapshots"
                  value={drawer.replay.timeline.filter((event) => event.kind === "result").length}
                />
              </div>
              <div className="replay-list" data-testid="odds-replay-list">
                {drawer.replay.timeline.map((event, index) => (
                  <div key={`${event.kind}-${event.capturedAt}-${index}`} className="replay-item">
                    <div className="replay-item-head">
                      <strong>{event.kind === "odds" ? "Odds" : event.kind === "quarter" ? "Quarter" : "Result"}</strong>
                      <span>{event.capturedAt}</span>
                    </div>
                    <div className="muted">
                      {event.quarter === null ? "No quarter" : `Q${event.quarter}`} · {replayEventSummary(event)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="drawer-section" data-testid="h2h-section">
          <h3>H2H block</h3>
          {drawer.histLoading && (
            <p className="muted" data-testid="h2h-loading">
              Loading history...
            </p>
          )}
          {!drawer.histLoading && drawer.h2h.length === 0 && (
            <p className="muted">
              <span data-testid="no-prior-meetings-label">No prior meetings</span> in loaded team histories.
            </p>
          )}
          <div className="h2h-list" data-testid="h2h-list">
            {drawer.h2h.map((entry) => {
              const matrix = parseH2HQuarterMatrix(entry.fullScore);
              return (
                <div key={entry.gameId} className="h2h-item" data-testid="h2h-item">
                  <div>
                    {entry.date} {entry.time} · {entry.scoreText}
                  </div>
                  <div className="muted">
                    {matrix.length > 0
                      ? matrix.map((value, index) => `Q${index + 1} ${value}`).join(" · ")
                      : entry.fullScore || "No quarter matrix"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="drawer-section">
          <h3>Team risk block</h3>
          {drawer.decision.teamFlags.length === 0 && (
            <p className="muted">Neither team is on the strongest or weakest watchlists.</p>
          )}
          {drawer.decision.teamFlags.map((flag) => {
            const tone = operatorSummary.team_risk.worst_teams.some((entry) => entry.team === flag.team)
              ? "bad"
              : "good";
            return (
              <div key={flag.team} className={`risk-row ${tone}`}>
                <strong>{flag.team}</strong>
                <span>
                  {formatPct(flag.win_rate)} win rate · {formatCurrency(flag.net_profit)}
                </span>
              </div>
            );
          })}
        </section>

        <section className="drawer-section">
          <h3>Matchup risk block</h3>
          {drawer.decision.matchupFlag ? (
            <div className="risk-row bad">
              <strong>{drawer.decision.matchupFlag.matchup}</strong>
              <span>
                {formatPct(drawer.decision.matchupFlag.win_rate)} win rate · {formatCurrency(drawer.decision.matchupFlag.net_profit)}
              </span>
            </div>
          ) : (
            <div className="risk-row neutral">
              <strong>{matchupKey(drawer.game.team1.shortName, drawer.game.team2.shortName)}</strong>
              <span>No flagged matchup risk in imported history.</span>
            </div>
          )}
          {drawer.detailErr && <p className="err">{drawer.detailErr}</p>}
        </section>
      </aside>
    </div>
  );
}
