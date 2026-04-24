import type { H2HEntry, LiveGame, ScheduleGame, TeamHistoryGame } from "./types";

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

function teamRef(t: RawTeam | undefined): { teamId: number; shortName: string; name: string } {
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

export function isTrulyLiveRow(item: Record<string, unknown>): boolean {
  const g = item.game as RawGame | undefined;
  const st = item.status as { id?: string; displayName?: string } | undefined;
  const candidates = [
    text(g?.gameStatus),
    text(st?.id),
    text(st?.displayName),
  ]
    .join(" ")
    .toLowerCase();

  // Hard exclusions: anything that looks finished/cancelled should not be treated as live.
  // Includes common English terms plus Russian status fragments (e.g. "Завершена/Окончен").
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

  // Hard live indicators.
  const liveIndicators = [
    "online",
    "live",
    "current",
    "progress",
    "прям",
    "идет",
    "онлайн",
  ];

  const hasLiveIndicator = liveIndicators.some((needle) => candidates.includes(needle));
  const timeToGo = text(item.timeToGo) || text(g?.timeToGo) || "";
  const hasTime = timeToGo !== "" && timeToGo !== "00:00" && timeToGo !== "0:00";
  const period = numberOrNull(item.period) ?? numberOrNull(g?.period);

  // Avoid misclassifying scheduled/placeholder rows as live.
  const s1 = typeof g?.score1 === "number" ? g.score1 : null;
  const s2 = typeof g?.score2 === "number" ? g.score2 : null;
  const scoreIsZeroPair = s1 !== null && s2 !== null && s1 === 0 && s2 === 0;

  // Recency guard: stale "online" rows must never be shown as live.
  // The production ghost card showed a historical `localDate` (Feb 2026) while tagged as live.
  const parsedLocalDate = (() => {
    const raw = String(g?.localDate ?? "").trim();
    if (!raw) return null;
    const datePart = raw.split("T")[0].split(" ")[0];

    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split("-").map((p) => Number.parseInt(p, 10));
      if (![y, m, d].every(Number.isFinite)) return null;
      return new Date(y, m - 1, d);
    }

    // dd.mm.yyyy
    let match = datePart.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      const day = Number.parseInt(dd, 10);
      const month = Number.parseInt(mm, 10);
      const year = Number.parseInt(yyyy, 10);
      if (![day, month, year].every(Number.isFinite)) return null;
      return new Date(year, month - 1, day);
    }

    // dd/mm/yyyy
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

  // Allow today and yesterday only. Anything older is stale and must not be shown.
  if (Math.abs(dayDiff) > 1) return false;

  // Avoid showing empty placeholders as live.
  if (scoreIsZeroPair) return false;

  // Strict: require either a real countdown OR an explicit live marker.
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

export function normalizeCalendarRow(
  item: Record<string, unknown>,
  tag: string
): ScheduleGame | null {
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

export function dedupeLiveGames(rows: ScheduleGame[]): ScheduleGame[] {
  const byKey = new Map<string, ScheduleGame>();
  const byFixture = new Map<string, ScheduleGame>();
  for (const row of rows) {
    const key = `${row.tag}:${row.gameId}`;
    byKey.set(key, row);
  }
  for (const row of byKey.values()) {
    const fixtureKey = `${row.tag}:${[row.team1.teamId, row.team2.teamId].sort((a, b) => a - b).join(":")}`;
    const existing = byFixture.get(fixtureKey);
    if (!existing) {
      byFixture.set(fixtureKey, row);
      continue;
    }
    const next =
      row.isLive && !existing.isLive
        ? row
        : row.period !== null && existing.period === null
          ? row
          : existing;
    byFixture.set(fixtureKey, next);
  }
  return [...byFixture.values()];
}

export function toLiveGame(sg: ScheduleGame): LiveGame {
  return { ...sg };
}

export function parseTeamHistory(raw: unknown, tag: string): TeamHistoryGame[] {
  const data = raw as {
    data?: { items?: { game?: RawGame; team1?: RawTeam; team2?: RawTeam }[] };
  };
  const items = data?.data?.items;
  if (!Array.isArray(items)) return [];
  const out: TeamHistoryGame[] = [];
  for (const row of items) {
    const g = row.game;
    if (!g?.id) continue;
    out.push({
      gameId: Number(g.id),
      scheduledTime: String((g as { scheduledTime?: string }).scheduledTime ?? ""),
      localDate: String(g.localDate ?? ""),
      localTime: String(g.localTime ?? ""),
      status: String(g.gameStatus ?? ""),
      scoreText: String(g.score ?? ""),
      fullScore: g.fullScore != null ? String(g.fullScore) : null,
      team1: teamRef(row.team1),
      team2: teamRef(row.team2),
      tag,
    });
  }
  return out;
}

export function computeH2H(
  historyA: TeamHistoryGame[],
  historyB: TeamHistoryGame[],
  teamIdA: number,
  teamIdB: number,
  limit = 12
): H2HEntry[] {
  const byId = new Map<number, TeamHistoryGame>();
  for (const h of historyA) byId.set(h.gameId, h);
  for (const h of historyB) {
    if (!byId.has(h.gameId)) byId.set(h.gameId, h);
  }
  const both = [...byId.values()].filter(
    (h) =>
      (h.team1.teamId === teamIdA && h.team2.teamId === teamIdB) ||
      (h.team1.teamId === teamIdB && h.team2.teamId === teamIdA)
  );
  both.sort((a, b) => (a.scheduledTime < b.scheduledTime ? 1 : -1));
  const entries: H2HEntry[] = [];
  for (const h of both.slice(0, limit)) {
    let winner: 0 | 1 | 2 = 0;
    const parts = h.scoreText.split(":");
    const na = h.team1.teamId === teamIdA ? parts[0] : parts[1];
    const nb = h.team1.teamId === teamIdA ? parts[1] : parts[0];
    const n1 = parseInt(String(na ?? "").trim(), 10);
    const n2 = parseInt(String(nb ?? "").trim(), 10);
    if (!Number.isNaN(n1) && !Number.isNaN(n2)) {
      if (n1 > n2) winner = 1;
      else if (n2 > n1) winner = 2;
    }
    entries.push({
      gameId: h.gameId,
      date: h.localDate,
      time: h.localTime,
      scoreText: h.scoreText,
      fullScore: h.fullScore,
      status: h.status,
      winner,
      homeTeamId: h.team1.teamId,
      awayTeamId: h.team2.teamId,
    });
  }
  return entries;
}
