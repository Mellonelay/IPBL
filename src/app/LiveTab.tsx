import { useEffect, useState } from "react";
import type { ScheduleGame } from "../api/types";
import { LIVE_DIVISIONS, canonicalDivisionLabel } from "../config/divisions";
import { operatorSummary } from "../operator/data";
import { projectLiveClock } from "../live/clock";
import { buildLiveDisplayInsights } from "../live/display";
import { summarizeBookmakerFailures } from "../live/source-status";
import type { LiveInsight, LiveSourceFailure } from "./app-types";
import { Metric, gameDivision, liveKey, statusTone } from "./shared";

function LiveGameClock({ game }: { game: ScheduleGame }) {
  const [capturedAt, setCapturedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const next = Date.now();
    setCapturedAt(next);
    setNow(next);
  }, [game.gameId, game.period, game.timeToGo, game.timeIsGo]);

  useEffect(() => {
    if (game.timeIsGo !== 1) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [game.timeIsGo]);

  const clock = projectLiveClock({
    period: game.period,
    timeToGo: game.timeToGo,
    timeIsGo: game.timeIsGo,
    elapsedMs: now - capturedAt,
  });

  return (
    <div className="live-clock" data-testid="live-game-clock" data-running={clock.running ? "true" : "false"}>
      <div className="live-clock-row">
        <span className="live-clock-value" data-testid="live-clock-remaining">{clock.remainingText}</span>
        <span>remaining</span>
      </div>
      <div className="live-clock-row live-clock-elapsed">
        <span className="live-clock-value" data-testid="live-clock-elapsed">{clock.elapsedText}</span>
        <span>elapsed</span>
      </div>
      {game.timeIsGo === 0 && clock.remainingSeconds !== null && <span className="live-clock-paused">paused</span>}
    </div>
  );
}

function LiveCard({
  game,
  insight,
  onOpen,
  onOpenH2H,
  onOpenIntelligence,
}: {
  game: ScheduleGame;
  insight?: LiveInsight;
  onOpen: (game: ScheduleGame, insight?: LiveInsight) => void;
  onOpenH2H: (game: ScheduleGame, insight?: LiveInsight) => void;
  onOpenIntelligence: (game?: ScheduleGame) => void;
}) {
  const currentQuarter = insight?.board.currentQuarter ?? (game.period ? `Q${game.period}` : "Live");
  const currentQuarterTotal = insight?.board.currentQuarterTotal ?? "—";
  const decision = insight?.decision;
  const flow = insight?.flow;

  return (
    <div className="operator-card">
      <button type="button" className="card-open-button" onClick={() => onOpen(game, insight)}>
        <div className="card-head">
          <div>
            <div className="card-title">
              {game.team1.shortName} vs {game.team2.shortName}
            </div>
            <div className="card-subtitle">
              {canonicalDivisionLabel(game.tag) ?? game.divisionLabel ?? game.tag}
            </div>
          </div>
          {decision && (
            <span className={`decision-pill ${statusTone(decision.decision)}`}>{decision.decision}</span>
          )}
        </div>

        <div className="score-row">
          <div className="score-main">{game.scoreText || "0 : 0"}</div>
          <div className="score-meta">
            <div>{currentQuarter}</div>
            <LiveGameClock game={game} />
          </div>
        </div>

        <div className="quarter-grid">
          <Metric label="Q1 total" value={insight?.board.quarterTotals.Q1 ?? "—"} />
          <Metric label="Q2 total" value={insight?.board.quarterTotals.Q2 ?? "—"} />
          <Metric label="Current quarter" value={currentQuarter} />
          <Metric label="Current total" value={currentQuarterTotal} />
        </div>

        <div className="bias-line">
          <strong>{decision?.suggestedBias ?? "Analyzing..."}</strong>
          <span>{flow?.signal && flow.signal !== "NO_SIGNAL" ? flow.signal : "Detecting flow..."}</span>
        </div>
      </button>

      <div className="card-actions">
        <button type="button" className="mini-btn" data-testid="live-card-h2h-button" onClick={() => onOpenH2H(game, insight)}>
          H2H
        </button>
        <button type="button" className="mini-btn" onClick={() => onOpenIntelligence(game)}>
          Intelligence
        </button>
      </div>
    </div>
  );
}

export type LiveTabProps = {
  liveGames: ScheduleGame[];
  liveInsights: Record<string, LiveInsight>;
  liveLoading: boolean;
  liveErr: string | null;
  liveSourceFailures: LiveSourceFailure[];
  selectedLiveDivisionTag: string;
  onSelectDivisionTag: (tag: string) => void;
  onOpenGame: (game: ScheduleGame, insight?: LiveInsight) => void;
  onOpenH2H: (game: ScheduleGame, insight?: LiveInsight) => void;
  onOpenIntelligence: (game?: ScheduleGame) => void;
};

export default function LiveTab({
  liveGames,
  liveInsights,
  liveLoading,
  liveErr,
  liveSourceFailures,
  selectedLiveDivisionTag,
  onSelectDivisionTag,
  onOpenGame,
  onOpenH2H,
  onOpenIntelligence,
}: LiveTabProps) {
  const displayLiveInsights = buildLiveDisplayInsights({
    games: liveGames,
    insights: liveInsights,
    selectedDivisionTag: selectedLiveDivisionTag,
    keyForGame: liveKey,
  });

  const menLive = displayLiveInsights.filter((insight) => gameDivision(insight.game) === "Men");
  const womenLive = displayLiveInsights.filter((insight) => gameDivision(insight.game) === "Women");

  return (
    <section className="tab-panel">
      <div className="summary-strip">
        <Metric label="Win rate" value={`${(operatorSummary.overall.win_rate * 100).toFixed(1)}%`} />
        <Metric label="Best quarter" value={operatorSummary.best_quarter.name} />
        <Metric label="Worst quarter" value={operatorSummary.worst_quarter.name} />
        <Metric label="Riskiest division" value={operatorSummary.worst_division.name} />
      </div>

      {!liveLoading && summarizeBookmakerFailures(liveSourceFailures) && (
        <div className="live-source-banner" role="status" aria-live="polite">
          <span className="status-badge caution">Bookmaker source issue</span>
          <span>{summarizeBookmakerFailures(liveSourceFailures)}</span>
        </div>
      )}

      {liveErr && <p className="err">{liveErr}</p>}
      {liveLoading && <p className="muted">Refreshing live operator cards...</p>}

      <div className="live-controls">
        <label>
          Live division
          <select value={selectedLiveDivisionTag} onChange={(e) => onSelectDivisionTag(e.target.value)}>
            <option value="">All live divisions</option>
            {LIVE_DIVISIONS.map((division) => (
              <option key={division.tag} value={division.tag}>
                {division.label}
              </option>
            ))}
          </select>
        </label>
        <div className="live-intelligence-handoff">
          <span className="muted">Need replay, H2H, and deeper risk detail?</span>
          <button type="button" className="mini-btn" onClick={() => onOpenIntelligence(displayLiveInsights[0]?.game ?? liveGames[0])}>
            Open Intelligence
          </button>
        </div>
      </div>

      {!liveLoading && liveGames.length === 0 && displayLiveInsights.length === 0 && (
        <div className="muted">
          <p>No approved live games are active right now.</p>
          {summarizeBookmakerFailures(liveSourceFailures) && <p>{summarizeBookmakerFailures(liveSourceFailures)}</p>}
        </div>
      )}

      {!liveLoading && liveGames.length > 0 && displayLiveInsights.length === 0 && (
        <p className="muted">No live games match the selected division filters.</p>
      )}

      {menLive.length > 0 && (
        <section className="live-section-group">
          <h3 className="live-section-title">Men</h3>
          <div className="live-card-grid">
            {menLive.map((insight) => (
              <LiveCard
                key={liveKey(insight.game)}
                game={insight.game}
                insight={insight}
                onOpen={onOpenGame}
                onOpenH2H={onOpenH2H}
                onOpenIntelligence={onOpenIntelligence}
              />
            ))}
          </div>
        </section>
      )}

      {womenLive.length > 0 && (
        <section className="live-section-group">
          <h3 className="live-section-title">Women</h3>
          <div className="live-card-grid">
            {womenLive.map((insight) => (
              <LiveCard
                key={liveKey(insight.game)}
                game={insight.game}
                insight={insight}
                onOpen={onOpenGame}
                onOpenH2H={onOpenH2H}
                onOpenIntelligence={onOpenIntelligence}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
