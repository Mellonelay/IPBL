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
    ];
    if (deadIndicators.some((needle) => candidates.includes(needle))) return false;

    if (
        candidates.includes("result") ||
        candidates.includes("finish") ||
        candidates.includes("confirmed") ||
        candidates.includes("scheduled") ||
        candidates.includes("cancel")
    ) {
        return false;
    }

    const liveIndicators = ["online", "live", "current", "progress", "прям", "идет", "онлайн"];  

    const hasLiveIndicator = liveIndicators.some((needle) => candidates.includes(needle));
    const timeToGo = text(item.timeToGo) || text(g?.timeToGo) || "";
    const hasTime = timeToGo !== "" && timeToGo !== "00:00" && timeToGo !== "0:00";
    const period = numberOrNull(item.period) ?? numberOrNull(g?.period);

    const s1 = typeof g?.score1 === "number" ? g.score1 : null;
    const s2 = typeof g?.score2 === "number" ? g.score2 : null;
    const scoreIsZeroPair = s1 !== null && s2 !== null && s1 === 0 && s2 === 0;

    const parsedLocalDate = (() => {
        const raw = String(g?.localDate ?? "").trim();
        if (!raw) return null;
        const datePart = raw.split("T")[0].split(" ")[0];

        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            const [y, m, d] = datePart.split("-").map((p) => Number.parseInt(p, 10));
            if (![y, m, d].every(Number.isFinite)) return null;
            return new Date(y, m - 1, d);
        }

        let match = datePart.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (match) {
            const [, dd, mm, yyyy] = match;
            const day = Number.parseInt(dd, 10);
            const month = Number.parseInt(mm, 10);
            const year = Number.parseInt(yyyy, 10);
            if (![day, month, year].every(Number.isFinite)) return null;
            return new Date(year, month - 1, day);
        }

        match = datePart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            const [, dd, mm, yyyy] = match;
            const day = Number.parseInt(dd, 10);
            const month = Number.parseInt(mm, 10);
            const year = Number.parseInt(yyyy, 10);
            if (![day, month, year].every(Number.isFinite)) return null;
            return new Date(year, month - 1, day);
        }

        const asDate = new Date(datePart);
        if (Number.isNaN(asDate.getTime())) return null;
        return asDate;
    })();

    if (!parsedLocalDate) return false;
    const now = new Date();
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const parsedStart = new Date(
        parsedLocalDate.getFullYear(),
        parsedLocalDate.getMonth(),
        parsedLocalDate.getDate()
    ).getTime();
    const dayDiff = Math.round((nowStart - parsedStart) / 86_400_000);

    if (Math.abs(dayDiff) > 1) return false;

    if (scoreIsZeroPair) return false;

    if (hasTime) return true;
    if (hasLiveIndicator && period !== null) return true;
    if (hasLiveIndicator) return true;
    return false;
}

function getScoreText(g: RawGame | undefined, live: boolean): string {
    const explicit = text(g?.score).trim();
    if (explicit) return explicit.replace(":", " : ");
    const s1 = typeof g?.score1 === "number" ? g.score1 : null;
    const s2 = typeof g?.score2 === "number" ? g.score2 : null;
    if (s1 !== null && s2 !== null) return `${s1} : ${s2}`;
    return live ? "—" : "0 : 0";
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
        statusDisplay: String(st?.displayName ?? status),
        upstreamStatusId: st?.id ? String(st.id) : null,
        score1: Number(g.score1 ?? 0),
        score2: Number(g.score2 ?? 0),
        scoreText: getScoreText(g, live),
        fullScore: g.fullScore != null ? String(g.fullScore) : null,
        localDate: String(g.localDate ?? ""),
        localTime: String(g.localTime ?? ""),
        divisionLabel: String(item.division ?? ""),
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