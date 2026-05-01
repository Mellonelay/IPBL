import type { ScheduleGame } from "../api/types";
import { operatorRules, operatorSummary, type MetricSummary, type RiskEntry } from "./data";

export type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";

export type ScoreboardAnalysis = {
    quarterTotals: Partial<Record<QuarterKey, number>>;
    currentQuarter: QuarterKey | null;
    currentQuarterTotal: number | null;
    quarterClock: string | null;
    firstHalfTotal: number | null;
    secondHalfTotal: number | null;
    fullScoreTotal: number | null;
};

export type QuarterFlowAnalysis = {
    q1Points: number | null;
    q2Points: number | null;
    q1Pace: number | null;
    q2Pace: number | null;
    paceTrend: "ACCELERATION" | "DECELERATION" | "FLAT" | "UNKNOWN";
    signal: string;
    suggestedBias: string | null;
    liveAdjustment: number;
    nextQuarter: QuarterKey | null;
};

export type OperatorDecision = {
    decision: "ALLOW" | "CAUTION" | "BLOCK";
    score: number;
    reasons: string[];
    suggestedBias: string | null;
    quarterContext: MetricSummary | null;
    divisionContext: MetricSummary | null;
    oddsContext: MetricSummary | null;
    flow: QuarterFlowAnalysis | null;
    teamFlags: RiskEntry[];
    matchupFlag: RiskEntry | null;
};

type EvaluateInput = {
    quarter: QuarterKey | null;
    division: "Men" | "Women";
    odds?: number | null;
    hour?: number | null;
    team1: string;
    team2: string;
    flow?: QuarterFlowAnalysis | null;
};

import CANONICAL_MAP from "../config/canonical_team_map.json";

export function normalizeTeam(name: string): string {
    const entry = (CANONICAL_MAP as any)[name.trim()];
    if (entry) return String(entry.teamId);
    
    return name
        .toLowerCase()
        .replace(/\s*\(women\)\s*/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function matchupKey(team1: string, team2: string): string {
    const id1 = normalizeTeam(team1);
    const id2 = normalizeTeam(team2);
    
    // Sort so key is stable: "id1_vs_id2"
    return [id1, id2].sort().join("_vs_");
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function deepFind(obj: unknown, keys: string[]): unknown {
    if (!obj || typeof obj !== "object") return null;
    const record = obj as Record<string, unknown>;
    for (const key of keys) {
        if (key in record) return record[key];
    }
    for (const value of Object.values(record)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = deepFind(item, keys);
                if (found != null) return found;
            }
        } else if (typeof value === "object" && value !== null) {
            const found = deepFind(value, keys);
            if (found != null) return found;
        }
    }
    return null;
}

function getPeriodMinutes(gameDetailRaw: unknown, index: number): number {
    const live = asRecord(asRecord(asRecord(gameDetailRaw)?.data)?.result)?.live;
    const parts = String(asRecord(live)?.periods ?? "")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
    return parts[index] || 10;
}

export function getScoreboardAnalysis(
    game: ScheduleGame,
    boxRaw: unknown | null,
    gameDetailRaw: unknown | null
): ScoreboardAnalysis {
    const result = asRecord(asRecord(asRecord(boxRaw)?.data)?.result);
    const scoreByPeriods = Array.isArray(result?.scoreByPeriods) ? result?.scoreByPeriods : [];
    const quarterTotals: Partial<Record<QuarterKey, number>> = {};

    scoreByPeriods.slice(0, 4).forEach((period, index) => {
        const row = asRecord(period);
        const total = Number(row?.score1 ?? 0) + Number(row?.score2 ?? 0);
        quarterTotals[`Q${index + 1}` as QuarterKey] = total;
    });

    if (Object.keys(quarterTotals).length === 0 && game.fullScore) {
        game.fullScore
            .split(",")
            .map((chunk) => chunk.trim())
            .slice(0, 4)
            .forEach((chunk, index) => {
                const values = chunk
                    .split(":")
                    .map((value) => Number.parseInt(value.trim(), 10))
                    .filter((value) => Number.isFinite(value));
                if (values.length === 2) {
                    quarterTotals[`Q${index + 1}` as QuarterKey] = values[0] + values[1];
                }
            });
    }

    const parsedTotal = game.scoreText
        .split(":")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));
    const fullScoreTotal = parsedTotal.length === 2 ? parsedTotal[0] + parsedTotal[1] : null;
    const completedTotal = Object.values(quarterTotals).reduce((sum, value) => sum + (value ?? 0), 0);
    const completedCount = Object.values(quarterTotals).length;

    let currentQuarter: QuarterKey | null = null;
    let currentQuarterTotal: number | null = null;

    if (completedCount > 0) {
        if (fullScoreTotal !== null && fullScoreTotal > completedTotal && completedCount < 4) {
            currentQuarter = `Q${completedCount + 1}` as QuarterKey;
            currentQuarterTotal = fullScoreTotal - completedTotal;
        } else {
            currentQuarter = `Q${Math.min(completedCount, 4)}` as QuarterKey;
            currentQuarterTotal = quarterTotals[currentQuarter] ?? null;
        }
    }

    const q1 = quarterTotals.Q1 ?? null;
    const q2 = quarterTotals.Q2 ?? null;
    const q3 = quarterTotals.Q3 ?? null;
    const q4 = quarterTotals.Q4 ?? null;

    const minute = deepFind(gameDetailRaw, ["currentMinute", "minute", "minutes"]);
    const second = deepFind(gameDetailRaw, ["currentSecond", "second", "seconds"]);
    const quarterClock =
        typeof minute === "number" && typeof second === "number"
            ? `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`
            : null;

    return {
        quarterTotals,
        currentQuarter,
        currentQuarterTotal,
        quarterClock,
        firstHalfTotal: q1 !== null && q2 !== null ? q1 + q2 : null,
        secondHalfTotal: q3 !== null && q4 !== null ? q3 + q4 : null,
        fullScoreTotal,
    };
}

export function analyzeQuarterFlow(
    game: ScheduleGame,
    boxRaw: unknown | null,
    gameDetailRaw: unknown | null
): QuarterFlowAnalysis {
    const board = getScoreboardAnalysis(game, boxRaw, gameDetailRaw);
    const q1Points = board.quarterTotals.Q1 ?? null;
    const q2Points = board.quarterTotals.Q2 ?? null;
    const q1Pace = q1Points !== null ? q1Points / getPeriodMinutes(gameDetailRaw, 0) : null;
    const q2Pace = q2Points !== null ? q2Points / getPeriodMinutes(gameDetailRaw, 1) : null;

    const signals: string[] = [];
    let suggestedBias: string | null = null;
    let liveAdjustment = 0;
    let paceTrend: QuarterFlowAnalysis["paceTrend"] = "UNKNOWN";

    if (q1Points !== null && q1Points >= 50) {
        signals.push("HIGH_SCORING_Q1");
        suggestedBias = "UNDER";
        liveAdjustment -= 1;
    }

    if (q1Points !== null && q1Points <= 40) {
        signals.push("LOW_SCORING_Q1");
        suggestedBias = "OVER";
        liveAdjustment += 1;
    }

    if (q1Pace !== null && q2Pace !== null) {
        if (q2Pace < q1Pace) {
            paceTrend = "DECELERATION";
            signals.push("DECELERATION");
            suggestedBias = suggestedBias ?? "UNDER";
            liveAdjustment -= 2;
        } else if (q2Pace > q1Pace) {
            paceTrend = "ACCELERATION";
            signals.push("ACCELERATION");
            suggestedBias = suggestedBias ?? "OVER";
            liveAdjustment += 2;
        } else {
            paceTrend = "FLAT";
        }
    }

    const nextQuarter =
        board.currentQuarter === "Q1"
            ? "Q2"
            : board.currentQuarter === "Q2"
                ? "Q3"
                : board.currentQuarter === "Q3"
                    ? "Q4"
                    : null;

    return {
        q1Points,
        q2Points,
        q1Pace,
        q2Pace,
        paceTrend,
        signal: signals.join("_") || "NO_SIGNAL",
        suggestedBias,
        liveAdjustment,
        nextQuarter,
    };
}

function oddsBand(odds: number | null | undefined): keyof typeof operatorSummary.odds_bands | null {
    if (odds == null || !Number.isFinite(odds)) return null;
    if (odds >= 2) return "2.00+";
    if (odds >= 1.8) return "1.80-1.99";
    if (odds >= 1.6) return "1.60-1.79";
    return null;
}

function teamFlags(team1: string, team2: string): RiskEntry[] {
    const names = new Set([normalizeTeam(team1), normalizeTeam(team2)]);
    const flags = [
        ...(operatorSummary?.team_risk?.worst_teams || []).filter((entry) => entry.team && names.has(entry.team)),
        ...(operatorSummary?.team_risk?.best_teams || []).filter((entry) => entry.team && names.has(entry.team)),
    ];
    return flags;
}

export function evaluateOperatorDecision(input: EvaluateInput): OperatorDecision {
    let score = 0;
    const reasons: string[] = [];

    if (input.quarter === "Q1") {
        score -= 3;
        reasons.push("Q1 is your weakest historical quarter.");
    }
    if (input.quarter && operatorRules.safeQuarters.includes(input.quarter as any)) {
        score += 2;
        reasons.push(`${input.quarter} is one of your allowed quarters.`);
    }

    if (input.division === "Women") {
        score -= 3;
        reasons.push("Women's IPBL is your weaker division historically.");
    } else {
        score += 1;
        reasons.push("Men's IPBL is your safer division historically.");
    }

    const band = oddsBand(input.odds);
    if (band === "1.60-1.79") {
        score += 2;
        reasons.push("Odds 1.60-1.79 are your strongest odds band.");
    }
    if (band === "1.80-1.99" || band === "2.00+") {
        score -= 3;
        reasons.push("Higher odds are a danger band in your own results.");
    }

    if (typeof input.hour === "number") {
        if (operatorRules.safeHours.includes(input.hour as any)) {
            score += 2;
            reasons.push(`${input.hour}:00 is a strong historical timing window.`);
        }
        if (operatorRules.dangerousHours.includes(input.hour as any)) {
            score -= 3;
            reasons.push(`${input.hour}:00 is a dangerous historical timing window.`);
        }
    }

    const matchup = (operatorSummary?.matchup_risk?.worst_matchups || []).find(
        (entry) => entry.matchup === matchupKey(input.team1, input.team2)
    ) ?? null;
    const teams = teamFlags(input.team1, input.team2);

    if (matchup) {
        score -= 4;
        reasons.push(`${input.team1} vs ${input.team2} is a historically dangerous matchup.`);
    }

    for (const flag of teams) {
        if ((operatorSummary?.team_risk?.worst_teams || []).some((entry) => entry.team === flag.team)) {
            score -= 4;
            reasons.push(`${flag.team} is on your worst-team risk list.`);
        }
    }

    const quarterContext = input.quarter ? operatorSummary.by_quarter[input.quarter] : null;
    const divisionContext = operatorSummary.by_division[input.division];
    const oddsContext = band ? operatorSummary.odds_bands[band] : null;

    if (input.flow) {
        score += input.flow.liveAdjustment;
        if (input.flow.signal !== "NO_SIGNAL") {
            reasons.push(`Live quarter-flow signal: ${input.flow.signal}.`);
        }
        if (input.flow.suggestedBias && input.flow.nextQuarter) {
            reasons.push(`Live bias leans ${input.flow.nextQuarter} ${input.flow.suggestedBias}.`);
        }
    }

    return {
        decision: score >= 3 ? "ALLOW" : score < 0 ? "BLOCK" : "CAUTION",
        score,
        reasons,
        suggestedBias:
            input.flow?.suggestedBias && input.flow.nextQuarter
                ? `${input.flow.nextQuarter} ${input.flow.suggestedBias}`
                : null,
        quarterContext,
        divisionContext,
        oddsContext,
        flow: input.flow ?? null,
        teamFlags: teams,
        matchupFlag: matchup,
    };
}

export function getHistoricalContext(quarter: QuarterKey | null, division: "Men" | "Women", odds?: number | null) {
    return {
        quarter: quarter ? operatorSummary.by_quarter[quarter] : null,
        division: operatorSummary.by_division[division],
        odds: oddsBand(odds) ? operatorSummary.odds_bands[oddsBand(odds)!] : null,
    };
}

export function parseH2HQuarterMatrix(fullScore: string | null): number[] {
    if (!fullScore) return [];
    return fullScore
        .split(",")
        .map((part) => part.trim())
        .map((part) =>
            part
                .split(":")
                .map((value) => Number.parseInt(value.trim(), 10))
                .filter((value) => Number.isFinite(value))
        )
        .filter((scores) => scores.length === 2)
        .map((scores) => scores[0] + scores[1]);
}
