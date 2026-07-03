import { useEffect, useMemo, useState } from "react";
import { fetchTeamGames } from "../api/client";
import type { ScheduleGame, TeamHistoryGame } from "../api/types";
import { TEAM_STATISTICS_DIVISIONS, teamsForDivision } from "../config/teams";
import { resolveTeamSelectionFromParams } from "./team-selection";
import {
  buildTeamProfile,
  parseQuarterTotals,
  teamHistoryToScheduleGame,
  teamResultForGame,
  type TeamRange,
} from "../teams/statistics";

function initialSelection(): { divisionTag: string; teamId: number; range: TeamRange } {
  return resolveTeamSelectionFromParams(new URLSearchParams(window.location.search));
}

function formatNumber(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

function formatRate(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export default function TeamStatistics({
  season,
  refreshToken,
  onOpenGame,
}: {
  season: number;
  refreshToken: number;
  onOpenGame: (game: ScheduleGame) => void;
}) {
  const [initial] = useState(initialSelection);
  const [divisionTag, setDivisionTag] = useState(initial.divisionTag);
  const availableTeams = useMemo(() => teamsForDivision(divisionTag), [divisionTag]);
  const [teamId, setTeamId] = useState<number>(initial.teamId);
  const [range, setRange] = useState<TeamRange>(initial.range);
  const [games, setGames] = useState<TeamHistoryGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!availableTeams.some((team) => team.teamId === teamId)) {
      setTeamId(availableTeams[0]?.teamId ?? 0);
    }
  }, [availableTeams, teamId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "teams");
    params.set("division", divisionTag);
    params.set("team", String(teamId));
    params.set("range", String(range));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [divisionTag, teamId, range]);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchTeamGames(teamId, divisionTag, season, range)
      .then((rows) => {
        if (!cancelled) setGames(rows);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Team history failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [divisionTag, teamId, season, range, refreshToken]);

  const team = availableTeams.find((item) => item.teamId === teamId) ?? availableTeams[0] ?? null;
  const profile = useMemo(() => buildTeamProfile(games, teamId, range), [games, teamId, range]);

  return (
    <section className="tab-panel team-statistics" data-testid="team-statistics-page">
      <div className="results-controls team-controls">
        <label>
          Team statistics division
          <select
            data-testid="team-division-select"
            value={divisionTag}
            onChange={(event) => setDivisionTag(event.target.value)}
          >
            {TEAM_STATISTICS_DIVISIONS.map((division) => (
              <option key={division.tag} value={division.tag}>{division.label}</option>
            ))}
          </select>
        </label>
        <label>
          Team
          <select
            data-testid="team-select"
            value={teamId}
            onChange={(event) => setTeamId(Number(event.target.value))}
          >
            {availableTeams.map((item) => (
              <option key={item.teamId} value={item.teamId}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          Range
          <select
            data-testid="team-range-select"
            value={range}
            onChange={(event) => setRange(event.target.value === "all" ? "all" : Number(event.target.value) as 5 | 10 | 30)}
          >
            <option value={5}>Last 5</option>
            <option value={10}>Last 10</option>
            <option value={30}>Last 30</option>
            <option value="all">All available</option>
          </select>
        </label>
      </div>

      <section className="team-profile-header">
        <div>
          <h2 data-testid="team-profile-name">{team?.name ?? "Team"}</h2>
          <p className="muted">{TEAM_STATISTICS_DIVISIONS.find((division) => division.tag === divisionTag)?.label}</p>
        </div>
        <div className="team-sample-badge">{profile.games.length} shown · {profile.totalAvailable} available</div>
      </section>

      {loading && <p className="muted" data-testid="team-loading">Loading official team history…</p>}
      {error && <p className="err" data-testid="team-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="summary-strip team-summary" data-testid="team-summary">
            <div className="metric-box"><div className="metric-label">Games</div><div className="metric-value">{profile.games.length}</div></div>
            <div className="metric-box"><div className="metric-label">Wins</div><div className="metric-value">{profile.wins}</div></div>
            <div className="metric-box"><div className="metric-label">Losses</div><div className="metric-value">{profile.losses}</div></div>
            <div className="metric-box"><div className="metric-label">Average final total</div><div className="metric-value">{formatNumber(profile.averageFinalTotal)}</div></div>
          </div>

          <section className="team-section-card">
            <h3>Quarter profile</h3>
            <div className="quarter-grid">
              {profile.quarterAverages.map((value, index) => (
                <div className="metric-box" key={`quarter-${index + 1}`}>
                  <div className="metric-label">Average Q{index + 1} total</div>
                  <div className="metric-value">{formatNumber(value)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="team-section-card" data-testid="team-transition-profile">
            <h3>Quarter transitions</h3>
            <p className="muted">Percentages describe verified games in the selected range; every signal includes its sample size.</p>
            <div className="team-transition-grid">
              {profile.transitions.map((transition) => (
                <article className="team-transition-card" key={`${transition.from}-${transition.to}`}>
                  <strong>Q{transition.from} → Q{transition.to} increase</strong>
                  <div className="team-transition-rate">{formatRate(transition.rate)}</div>
                  <div className="muted">{transition.increases} of {transition.samples} games</div>
                  <div className="muted">Average change {transition.averageDelta === null ? "—" : `${transition.averageDelta >= 0 ? "+" : ""}${transition.averageDelta.toFixed(1)}`}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="team-section-card">
            <h3>Match history</h3>
            {profile.games.length === 0 && <p className="muted">No completed games in the selected history.</p>}
            <div className="team-history-list" data-testid="team-history-list">
              {profile.games.map((game) => {
                const quarters = parseQuarterTotals(game.fullScore);
                const result = teamResultForGame(game, teamId);
                return (
                  <article className="team-history-row" data-testid="team-history-row" key={game.gameId}>
                    <button type="button" className="team-history-open" onClick={() => onOpenGame(teamHistoryToScheduleGame(game))}>
                      <div className="team-history-main">
                        <span className={`team-result team-result-${result === "—" ? "unknown" : result.toLowerCase()}`}>{result}</span>
                        <div>
                          <strong>{game.localDate} {game.localTime}</strong>
                          <div>{game.team1.shortName} vs {game.team2.shortName}</div>
                        </div>
                        <span className="team-history-score">{game.scoreText}</span>
                      </div>
                      <div className="calendar-quarter-line">
                        {quarters.length ? quarters.map((value, index) => `Q${index + 1} ${value}`).join(" · ") : "No complete quarter matrix"}
                      </div>
                      <span className="mini-btn team-history-action">Game details · H2H</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
