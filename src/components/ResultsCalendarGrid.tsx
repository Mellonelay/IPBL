import { useEffect, useMemo, useRef } from "react";
import { RESULTS_DIVISIONS, type ResultsCalendarMap, type ResultsGame } from "../results/calendar";

type CalendarMatch = {
  game: ResultsGame;
  time: string;
  teams: string;
  score: string;
  division: string;
  quarterTotals: string | null;
};

type Props = {
  calendarMap: ResultsCalendarMap;
  selectedDivisionTag: string;
  selectedMonthKey: string;
  onSelectMonthKey: (monthKey: string) => void;
  monthOptions: Array<{ value: string; label: string }>;
  jumpDate: string;
  loading: boolean;
  error: string | null;
  onJumpDateChange: (date: string) => void;
  onSelectDivision: (divisionTag: string) => void;
  onOpenMatch: (game: ResultsGame) => void;
  onOpenH2H: (game: ResultsGame) => void;
};

function formatHeader(iso: string): string {
  const parts = typeof iso === "string" ? iso.split("-").map(Number) : [];
  const [year, month, day] = parts;
  if (!year || !month || !day) return String(iso || "Unknown date");
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(game: ResultsGame): string {
  return typeof game.time === "string" && game.time.length > 0 ? game.time : "TBD";
}

function formatTeams(game: ResultsGame): string {
  return `${game.homeTeam || "Home"} vs ${game.awayTeam || "Away"}`;
}

function formatScore(game: ResultsGame): string {
  const home = typeof game.homeScore === "number" ? game.homeScore : null;
  const away = typeof game.awayScore === "number" ? game.awayScore : null;
  return home === null || away === null ? "—" : `${home}-${away}`;
}

function formatQuarterTotals(game: ResultsGame): string | null {
  const quarters = Array.isArray(game.quarters) ? game.quarters : [];
  if (!quarters.length) return null;
  return quarters
    .map((q, idx) => {
      const home = typeof q.home === "number" ? q.home : "—";
      const away = typeof q.away === "number" ? q.away : "—";
      return `Q${idx + 1} ${home}-${away}`;
    })
    .join(" · ");
}

function normalizeMatch(game: ResultsGame, division: string): CalendarMatch {
  return {
    game,
    time: formatTime(game),
    teams: formatTeams(game),
    score: formatScore(game),
    division,
    quarterTotals: formatQuarterTotals(game),
  };
}

export function ResultsCalendarGrid({
  calendarMap,
  selectedDivisionTag,
  selectedMonthKey,
  onSelectMonthKey,
  monthOptions,
  jumpDate,
  loading,
  error,
  onJumpDateChange,
  onSelectDivision,
  onOpenMatch,
  onOpenH2H,
}: Props) {
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const visibleDays = useMemo(() => Object.keys(calendarMap || {}).sort(), [calendarMap]);

  useEffect(() => {
    if (!jumpDate) return;
    const node = dayRefs.current[jumpDate];
    if (node) window.requestAnimationFrame(() => node.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [jumpDate]);

  return (
    <section className="calendar-results-panel">
      <div className="calendar-toolbar">
        <label>
          Month
          <select value={selectedMonthKey} onChange={(e) => onSelectMonthKey(e.target.value)}>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label>
          Jump to date
          <input type="date" value={jumpDate} onChange={(e) => onJumpDateChange(e.target.value)} />
        </label>
        <label>
          Division
          <select value={selectedDivisionTag} onChange={(e) => onSelectDivision(e.target.value)}>
            {RESULTS_DIVISIONS.map((division) => (
              <option key={division.tag} value={division.tag}>{division.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="err">{error}</p>}
      {loading && <p className="muted">Loading results from cache (KV)...</p>}

      <div className="results-grid">
        {visibleDays.map((date) => {
          const rawDayData = calendarMap?.[date];
          const dayData = Array.isArray(rawDayData) ? rawDayData : [];
          const divisions = dayData.filter((division) => division.divisionTag === selectedDivisionTag);
          const visibleDivisions = divisions.filter((division) => Array.isArray(division.games) && division.games.length > 0);

          return (
            <div
              key={date}
              id={`day-${date}`}
              className="day-block"
              ref={(node) => {
                if (node) dayRefs.current[date] = node;
                else delete dayRefs.current[date];
              }}
            >
              <h3>{formatHeader(date)}</h3>
              {visibleDivisions.length === 0 && !loading && <div className="no-matches">No matches today</div>}
              {visibleDivisions.length === 0 && loading && <div className="no-matches">Loading...</div>}

              {visibleDivisions.map((division) => {
                const matches = division.games.map((game) => normalizeMatch(game, division.division));
                return (
                  <section key={`${date}-${division.divisionTag}`} className="calendar-division-group">
                    <div className="calendar-division-title">{division.division}</div>
                    <div className="calendar-match-list">
                      {matches.map((match) => (
                        <div key={`${date}-${division.divisionTag}-${match.game.gameId}`} className="calendar-match-row">
                          <button type="button" className="calendar-match-open" onClick={() => onOpenMatch(match.game)}>
                            <div className="calendar-match-main">
                              <span className="calendar-time">{match.time}</span>
                              <span className="calendar-teams">{match.teams}</span>
                            </div>
                            <div className="calendar-match-side">
                              <strong>{match.score}</strong>
                              <span className="calendar-division-badge">{match.division.replace("Pro ", "")}</span>
                            </div>
                            {match.quarterTotals && <div className="calendar-quarter-line">{match.quarterTotals}</div>}
                          </button>
                          <div className="calendar-match-actions">
                            <button type="button" className="mini-btn" data-testid="results-calendar-h2h-button" onClick={() => onOpenH2H(match.game)}>
                              H2H
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ResultsCalendarGrid;
