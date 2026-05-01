import { useEffect, useMemo, useRef } from "react";
import type { ScheduleGame } from "../api/types";
import { RESULTS_DIVISIONS, type CalendarGridMap } from "../results/calendar";

type Props = {
    calendarMap: CalendarGridMap;
    selectedDivisionTag: string;
    selectedMonthKey: string; // YYYY-MM
    onSelectMonthKey: (value: string) => void;
    monthOptions: Array<{ value: string; label: string }>;
    jumpDate: string;
    loading: boolean;
    error: string | null;
    onJumpDateChange: (value: string) => void;
    onSelectDivision: (tag: string) => void;
    onOpenMatch: (game: ScheduleGame) => void;
    onOpenH2H: (game: ScheduleGame) => void;
};

function formatHeader(iso: string): string {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

const StreakBadge = ({ team, memory }: { team: string, memory: any }) => {
    const stats = memory[`${team}-any`] || { wins: 0 };
    if (stats.wins < 3) return null;
    return <span style={{ color: "#00c076", fontSize: "0.7rem", marginLeft: "4px" }}>● {stats.wins}W</span>;
};
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
    const allDays = useMemo(() => Object.keys(calendarMap || {}).sort(), [calendarMap]);

    // Always render every day in `calendarMap` for the selected month (March   31, April   30, etc.).
    // Pagination hid most of the month and looked like only the first row/columns existed.
    const visibleDays = allDays;

    useEffect(() => {
        if (!jumpDate) return;
        dayRefs.current[jumpDate]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [jumpDate]);

    return (
        <section className="calendar-results-panel">
            <div className="calendar-toolbar">
                <label>
                    Month
                    <select value={selectedMonthKey} onChange={(e) => onSelectMonthKey(e.target.value)}>
                        {monthOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
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
                            <option key={division.tag} value={division.tag}>
                                {division.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {error && <p className="err">{error}</p>}
            {loading && (
                <p className="muted">Loading results from cache (KV)...</p>
            )}

            <div className="results-grid">
                {visibleDays?.map((date) => { console.log("Rendering date:", date, "Data:", (calendarMap ? calendarMap[date] : []));
                    const dayData = calendarMap ? calendarMap[date] : [];
                    const divisions = (Array.isArray(dayData) ? dayData : []).filter(
                        (division) => division.divisionTag === selectedDivisionTag
                    );
                    const visibleDivisions = divisions.filter((division) => division.games.length > 0);

                    return (
                        <div
                            key={date}
                            id={`day-${date}`}
                            className="day-block"
                            ref={(node) => {
                                dayRefs.current[date] = node;
                            }}
                        >
                            <h3>{formatHeader(date)}</h3>
                            {visibleDivisions.length === 0 && !loading && (
                                <div className="no-matches">No matches today</div>
                            )}
                            {visibleDivisions.length === 0 && loading && <div className="no-matches">Loading...</div>}

                            {visibleDivisions.map((division) => (
                                <section key={`${date}-${division.divisionTag}`} className="calendar-division-group">
                                    <div className="calendar-division-title">{division.division}</div>
                                    <div className="calendar-match-list">
                                        {division.games.map((match) => (
                                            <div
                                                key={`${date}-${division.divisionTag}-${match.game.gameId}`}
                                                className="calendar-match-row"
                                            >
                                                <button type="button" className="calendar-match-open" onClick={() => onOpenMatch(match.game)}>
                                                    <div className="calendar-match-main">
                                                        <span className="calendar-time">{match.time}</span>
                                                        <span className="calendar-teams">{match.teams}</span>
                                                    </div>
                                                    <div className="calendar-match-side">
                                                        <strong>{match.score}</strong>
                                                        <span className="calendar-division-badge">
                                                            {match.division.replace("Pro ", "")}
                                                        </span>
                                                    </div>
                                                    {match.quarterTotals && (
                                                        <div className="calendar-quarter-line">{match.quarterTotals}</div>
                                                    )}
                                                </button>
                                                <div className="calendar-match-actions">
                                                    <button
                                                        type="button"
                                                        className="mini-btn"
                                                        data-testid="results-calendar-h2h-button"
                                                        onClick={() => onOpenH2H(match.game)}
                                                    >
                                                        H2H
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default ResultsCalendarGrid;
