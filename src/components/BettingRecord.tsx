import { useEffect, useMemo, useState } from "react";
import { availableBetDays, betMatchKey, validBetRows, type BettingHistoryRow } from "./betting-history";

type BetRow = BettingHistoryRow;

type LoadedState = {
    loading: boolean;
    error: string | null;
    rows: BetRow[];
};

function isoDateOnly(value: string): string {
    // dataset uses ISO timestamps; the date portion is stable for day filtering
    return value.slice(0, 10);
}

function formatTimeHHMM(value: string): string {
    // "2026-03-30T17:27:03.000Z" -> "17:27"
    return value.slice(11, 16);
}

function formatCurrencyMMK(value: number): string {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function BettingRecord() {
    const [selectedDate, setSelectedDate] = useState("");
    const [state, setState] = useState<LoadedState>({ loading: true, error: null, rows: [] });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/bet_history_clean.json");
                if (!res.ok) throw new Error(`Failed to load betting dataset (${res.status})`);
                const rows = validBetRows(await res.json());
                if (cancelled) return;
                setSelectedDate(availableBetDays(rows)[0] ?? "");
                setState({ loading: false, error: null, rows });
            } catch (e) {
                if (cancelled) return;
                setState({
                    loading: false,
                    error: e instanceof Error ? e.message : "Failed to load betting dataset",
                    rows: [],
                });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const availableDays = useMemo(() => availableBetDays(state.rows), [state.rows]);
    const betsForDay = useMemo(() => {
        if (!state.rows.length) return [];
        return state.rows
            .filter((row) => isoDateOnly(row.placed_at) === selectedDate)
            .sort((a, b) => a.placed_at.localeCompare(b.placed_at));
    }, [state.rows, selectedDate]);

    const groups = useMemo(() => {
        const byMatch = new Map<string, BetRow[]>();
        for (const bet of betsForDay) {
            const key = betMatchKey(bet);
            const arr = byMatch.get(key);
            if (!arr) byMatch.set(key, [bet]);
            else arr.push(bet);
        }

        const out: Array<{ matchId: string; matchTitle: string; matchDivision: string; bets: BetRow[] }> = [];
        for (const [matchId, bets] of byMatch.entries()) {
            const head = bets[0];
            out.push({
                matchId,
                matchTitle: `${head.team_1} vs ${head.team_2}`,
                matchDivision: head.division,
                bets,
            });
        }

        // consistent ordering by earliest placed_at
        out.sort((a, b) => a.bets[0].placed_at.localeCompare(b.bets[0].placed_at));
        return out;
    }, [betsForDay]);

    return (
        <section className="tab-panel">
            <div className="betting-controls">
                <label>
                    Date
                    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={state.loading || availableDays.length === 0} aria-label="Available betting record dates">
                      {availableDays.length === 0 && <option value="">No available days</option>}
                      {availableDays.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                </label>
            </div>

            <p className="muted">Historical imported betting records only; not a live account ledger. Times shown in UTC.</p>
            {state.loading && <p className="muted">Loading betting record…</p>}
            {state.error && <p className="err">{state.error}</p>}

            {!state.loading && !state.error && betsForDay.length === 0 && (
                <p className="muted">{availableDays.length === 0 ? "No valid imported betting records are available." : "No imported records for this date."}</p>
            )}

            {!state.loading &&
                !state.error &&
                groups.map((group) => (
                    <div key={group.matchId} className="betting-match">
                        <div className="betting-match-head">
                            <div>
                                <h3 className="betting-match-title">{group.matchTitle}</h3>
                                <div className="muted">{group.matchDivision}</div>
                            </div>
                        </div>

                        <div className="betting-bets">
                            {group.bets.map((bet) => (
                                <div key={bet.slip_id} className="betting-bet-row">
                                    <span className="bet-time">{formatTimeHHMM(bet.placed_at)}</span>
                                    <span className="bet-quarter">{bet.quarter}</span>
                                    <span className="bet-market">{bet.market_raw || "—"}</span>
                                    <span className="bet-odds">{bet.odds ? bet.odds.toFixed(2) : "—"}</span>
                                    <span className="bet-stake">{formatCurrencyMMK(bet.stake)}</span>
                                    <span className={`bet-pill ${bet.bet_status === "Win" ? "allow" : "block"}`}>
                                        {bet.bet_status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
        </section>
    );
}

