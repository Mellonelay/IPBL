/**
 * Calendar API normalization for results ingest only.
 * Duplicated from `src/api/normalize.ts` so Vercel functions never import `src/*`
 * (that graph breaks invocation for write-path lambdas).
 */

export type TeamRef = {
    teamId: number;
    shortName: string;
    name: string;
};

export type ScheduleGame = {
    gameId: number;
    tag: string;
    status: string;
    statusDisplay: string;
    upstreamStatusId: string | null;
    score1: number;
    score2: number;
    scoreText: string;
    fullScore: string | null;
    localDate: string;
    localTime: string;
    divisionLabel: string;
    period: number | null;
    timeToGo: string | null;
    isLive: boolean;
    team1: TeamRef;
    team2: TeamRef;
};

type RawTeam = {
    teamId?: number;
    shortName?: string;
    name?: string;
};

type RawGame = {
    id?: number;
    gameStatus?: string;
    score1?: number;
    score2?: number;
    score?: string;
    fullScore?: string | null;
    localDate?: string;
    localTime?: string;
    period?: number | null;
    timeToGo?: string | null;
};

function teamRef(t: RawTeam | undefined): TeamRef {
    if (!t) return { teamId: 0, shortName: "?", name: "?" };
    return {
        teamId: Number(t.teamId ?? 0),
        shortName: String(t.shortName ?? t.name ?? "?"),
        name: String(t.name ?? "?"),
    };
}

function text(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isTrulyLiveRow(item: Record<string, unknown>): boolean {
    const g = item.game as RawGame | undefined;
    const st = item.status as { id?: string; displayName?: string } | undefined;
    const candidates = [text(g?.gameStatus), text(st?.id), text(st?.displayName)].join(" ").toLowerCase();    

    const deadIndicators = [
        "result",
        "finish",
        "completed",
        "complete",
        "ended",
        "end",
        "final",
        "fulltime",
        "confirmed",
        "cancel",
        "cancelled",
        "canceled",
        "scheduled",
        "not started",
        "прерван",
        "заверш",
        "оконч",
        "итог",
        "отмен",
        "не начался",
    ];
    if (deadIndicators.some((needle) => candidates.includes(needle))) return false;

    const liveIndicators = ["online", "live", "current", "progress", "прям", "идет", "онлайн", "в игре"];  

    const hasLiveIndicator = liveIndicators.some((needle) => candidates.includes(needle));
    const timeToGo = text(item.timeToGo) || text(g?.timeToGo) || "";
    const hasTime = timeToGo !== "" && timeToGo !== "00:00" && timeToGo !== "0:00" && timeToGo !== "10:00";
    const period = numberOrNull(item.period) ?? numberOrNull(g?.period);

    const s1 = typeof g?.score1 === "number" ? g.score1 : null;
    const s2 = typeof g?.score2 === "number" ? g.score2 : null;
    const scoreIsZeroPair = (s1 === 0 && s2 === 0) || (s1 === null && s2 === null);

    if (hasTime && period !== null) return true;
    if (hasLiveIndicator && period !== null) return true;
    if (hasLiveIndicator && !scoreIsZeroPair) return true;
    
    return false;
}

function getScoreText(g: RawGame | undefined, live: boolean): string {
    const explicit = text(g?.score).trim();
    if (explicit && explicit !== "0:0") return explicit.replace(":", " : ");
    
    const s1 = typeof g?.score1 === "number" ? g.score1 : null;
    const s2 = typeof g?.score2 === "number" ? g.score2 : null;
    
    // Fallback: Try to calculate from fullScore if total scores are 0
    if ((s1 === 0 && s2 === 0) || (s1 === null || s2 === null)) {
        const full = text(g?.fullScore);
        if (full && full.includes(":")) {
            const totals = full.split(",").reduce((acc, part) => {
                const [p1, p2] = part.split(":").map(v => parseInt(v.trim(), 10));
                if (!isNaN(p1) && !isNaN(p2)) {
                    acc[0] += p1;
                    acc[1] += p2;
                }
                return acc;
            }, [0, 0]);
            if (totals[0] > 0 || totals[1] > 0) {
                return `${totals[0]} : ${totals[1]}`;
            }
        }
    }

    if (s1 !== null && s2 !== null) return `${s1} : ${s2}`;
    return live ? "—" : "0 : 0";
}

function cleanText(val: unknown): string {
    const s = text(val);
    if (!s) return "";
    // Aggressive cleanup of common triple-encoded UTF-8 artifacts
    return s
        .replace(/ÃƒÆ’Ã†â€™ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦/g, "...")
        .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â/g, "—")
        .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·/g, "·")
        .trim();
}

export function normalizeCalendarRow(item: Record<string, unknown>, tag: string): ScheduleGame | null {
    const g = item.game as RawGame | undefined;
    if (!g?.id) return null;
    const t1 = teamRef(item.team1 as RawTeam);
    const t2 = teamRef(item.team2 as RawTeam);
    const st = item.status as { id?: string; displayName?: string } | undefined;
    const status = String(g.gameStatus ?? st?.id ?? "Unknown");
    const live = isTrulyLiveRow(item);
    return {
        gameId: Number(g.id),
        tag,
        status,
        statusDisplay: cleanText(st?.displayName ?? status),
        upstreamStatusId: st?.id ? String(st.id) : null,
        score1: Number(g.score1 ?? 0),
        score2: Number(g.score2 ?? 0),
        scoreText: getScoreText(g, live),
        fullScore: g.fullScore != null ? String(g.fullScore) : null,
        localDate: String(g.localDate ?? ""),
        localTime: String(g.localTime ?? ""),
        divisionLabel: cleanText(item.division ?? ""),
        period: numberOrNull(item.period) ?? numberOrNull(g.period),
        timeToGo: text(item.timeToGo) || text(g.timeToGo) || null,
        isLive: live,
        team1: t1,
        team2: t2,
    };
}

export function parseCalendarItems(raw: unknown, tag: string): ScheduleGame[] {
    const data = raw as { data?: { items?: Record<string, unknown>[] } };
    const items = data?.data?.items;
    if (!Array.isArray(items)) return [];
    const out: ScheduleGame[] = [];
    for (const row of items) {
        const n = normalizeCalendarRow(row, tag);
        if (n) out.push(n);
    }
    return out;
}
