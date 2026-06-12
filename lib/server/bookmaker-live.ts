import type { ScheduleGame, TeamRef } from "./calendar-normalize.js";

export const MELBET_IPBL_LEAGUES = [
  { leagueId: 2496666, label: "IPBL Pro Men" },
  { leagueId: 2496667, label: "IPBL Pro Women" },
] as const;

function melbetIpblUrl(leagueId: number): string {
  return `https://melbet.com/service-api/LiveFeed/Get1x2_VZip?sports=3&champs=${leagueId}&count=40&lng=en&gr=62&mode=4&country=169&partner=8&getEmpty=true&virtualSports=true&noFilterBlockEvent=true`;
}

export const MELBET_IPBL_URLS = MELBET_IPBL_LEAGUES.map(({ leagueId }) => melbetIpblUrl(leagueId));
export const MELBET_IPBL_URL = MELBET_IPBL_URLS[0];

export type BookmakerSourceEvent = {
  I?: number;
  LI?: number;
  L?: string;
  O1?: string;
  O2?: string;
  S?: number;
  U?: number;
  SC?: {
    FS?: { S1?: number; S2?: number };
    PS?: Array<{ Key?: number; Value?: { S1?: number; S2?: number; NF?: string } }>;
    CP?: number;
    CPS?: string;
    TS?: number;
    TR?: number;
    SLS?: string;
  };
};

export type BookmakerEnvelope = {
  Success?: boolean;
  Error?: string | null;
  Value?: BookmakerSourceEvent[];
};

type VerifiedTeam = TeamRef & { tag: string; divisionLabel: string };

const VERIFIED_TEAM_ALIASES: Record<string, VerifiedTeam> = Object.fromEntries(
  Object.entries({
  "Barnaul": { teamId: 76038, shortName: "Barnaul", name: "Barnaul", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "Novosibirsk": { teamId: 76040, shortName: "Novosibirsk", name: "Novosibirsk", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "Sochi": { teamId: 76041, shortName: "Sochi", name: "Sochi", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "St. Petersburg": { teamId: 76039, shortName: "St. Petersburg", name: "St. Petersburg", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "St Petersburg": { teamId: 76039, shortName: "St. Petersburg", name: "St. Petersburg", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "Saint Petersburg": { teamId: 76039, shortName: "St. Petersburg", name: "St. Petersburg", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "StPetersburg": { teamId: 76039, shortName: "St. Petersburg", name: "St. Petersburg", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "Kazan": { teamId: 76051, shortName: "Kazan", name: "Kazan", tag: "ipbl-66-m-pro-b", divisionLabel: "Pro Men B" },
  "Krasnodar": { teamId: 76050, shortName: "Krasnodar", name: "Krasnodar", tag: "ipbl-66-m-pro-b", divisionLabel: "Pro Men B" },
  "Samara": { teamId: 76049, shortName: "Samara", name: "Samara", tag: "ipbl-66-m-pro-b", divisionLabel: "Pro Men B" },
  "Tyumen": { teamId: 76052, shortName: "Tyumen", name: "Tyumen", tag: "ipbl-66-m-pro-b", divisionLabel: "Pro Men B" },
  "Kaliningrad": { teamId: 76057, shortName: "Kaliningrad", name: "Kaliningrad", tag: "ipbl-66-m-pro-c", divisionLabel: "Pro Men C" },
  "Moscow": { teamId: 76058, shortName: "Moscow", name: "Moscow", tag: "ipbl-66-m-pro-c", divisionLabel: "Pro Men C" },
  "Moskow": { teamId: 76058, shortName: "Moscow", name: "Moscow", tag: "ipbl-66-m-pro-c", divisionLabel: "Pro Men C" },
  "Plavsk": { teamId: 76060, shortName: "Plavsk", name: "Plavsk", tag: "ipbl-66-m-pro-c", divisionLabel: "Pro Men C" },
  "Voronezh": { teamId: 76059, shortName: "Voronezh", name: "Voronezh", tag: "ipbl-66-m-pro-c", divisionLabel: "Pro Men C" },
  "Krasnoyarsk": { teamId: 76068, shortName: "Krasnoyarsk", name: "Krasnoyarsk", tag: "ipbl-66-m-pro-d", divisionLabel: "Pro Men D" },
  "Nizhny Novgorod": { teamId: 76067, shortName: "Nizhny Novgorod", name: "Nizhny Novgorod", tag: "ipbl-66-m-pro-d", divisionLabel: "Pro Men D" },
  "Nizhniy Novgorod": { teamId: 76067, shortName: "Nizhny Novgorod", name: "Nizhny Novgorod", tag: "ipbl-66-m-pro-d", divisionLabel: "Pro Men D" },
  "NizhniyNovgorod": { teamId: 76067, shortName: "Nizhny Novgorod", name: "Nizhny Novgorod", tag: "ipbl-66-m-pro-d", divisionLabel: "Pro Men D" },
  "Rostov-on-Don": { teamId: 76066, shortName: "Rostov-on-Don", name: "Rostov-on-Don", tag: "ipbl-66-m-pro-d", divisionLabel: "Pro Men D" },
  "Volgograd": { teamId: 76065, shortName: "Volgograd", name: "Volgograd", tag: "ipbl-66-m-pro-d", divisionLabel: "Pro Men D" },
  "Ryazan": { teamId: 76061, shortName: "Ryazan", name: "Ryazan", tag: "ipbl-66-m-pro-u", divisionLabel: "Pro Men U" },
  "Salavat": { teamId: 76064, shortName: "Salavat", name: "Salavat", tag: "ipbl-66-m-pro-u", divisionLabel: "Pro Men U" },
  "Serov": { teamId: 76062, shortName: "Serov", name: "Serov", tag: "ipbl-66-m-pro-u", divisionLabel: "Pro Men U" },
  "Smolensk": { teamId: 76063, shortName: "Smolensk", name: "Smolensk", tag: "ipbl-66-m-pro-u", divisionLabel: "Pro Men U" },
  "Bryansk": { teamId: 76021, shortName: "Bryansk", name: "Bryansk", tag: "ipbl-66-w-pro-a", divisionLabel: "Pro Women A" },
  "Izhevsk": { teamId: 76023, shortName: "Izhevsk", name: "Izhevsk", tag: "ipbl-66-w-pro-a", divisionLabel: "Pro Women A" },
  "Magnitogorsk": { teamId: 76022, shortName: "Magnitogorsk", name: "Magnitogorsk", tag: "ipbl-66-w-pro-a", divisionLabel: "Pro Women A" },
  "Novokuznetsk": { teamId: 76020, shortName: "Novokuznetsk", name: "Novokuznetsk", tag: "ipbl-66-w-pro-a", divisionLabel: "Pro Women A" },
  "Cheboksary": { teamId: 76012, shortName: "Cheboksary", name: "Cheboksary", tag: "ipbl-66-w-pro-b", divisionLabel: "Pro Women B" },
  "Tambov": { teamId: 76014, shortName: "Tambov", name: "Tambov", tag: "ipbl-66-w-pro-b", divisionLabel: "Pro Women B" },
  "Tomsk": { teamId: 76015, shortName: "Tomsk", name: "Tomsk", tag: "ipbl-66-w-pro-b", divisionLabel: "Pro Women B" },
  "Yaroslavl": { teamId: 76013, shortName: "Yaroslavl", name: "Yaroslavl", tag: "ipbl-66-w-pro-b", divisionLabel: "Pro Women B" },
  "Kaluga": { teamId: 76029, shortName: "Kaluga", name: "Kaluga", tag: "ipbl-66-w-pro-c", divisionLabel: "Pro Women C" },
  "Murino": { teamId: 76030, shortName: "Murino", name: "Murino", tag: "ipbl-66-w-pro-c", divisionLabel: "Pro Women C" },
  "Norilsk": { teamId: 76031, shortName: "Norilsk", name: "Norilsk", tag: "ipbl-66-w-pro-c", divisionLabel: "Pro Women C" },
  "Vladivostok": { teamId: 76028, shortName: "Vladivostok", name: "Vladivostok", tag: "ipbl-66-w-pro-c", divisionLabel: "Pro Women C" },
  "Berezniki": { teamId: 76026, shortName: "Berezniki", name: "Berezniki", tag: "ipbl-66-w-pro-d", divisionLabel: "Pro Women D" },
  "Ekaterinburg": { teamId: 76025, shortName: "Ekaterinburg", name: "Ekaterinburg", tag: "ipbl-66-w-pro-d", divisionLabel: "Pro Women D" },
  "Khimki": { teamId: 76027, shortName: "Khimki", name: "Khimki", tag: "ipbl-66-w-pro-d", divisionLabel: "Pro Women D" },
  "Toliatti": { teamId: 76024, shortName: "Toliatti", name: "Toliatti", tag: "ipbl-66-w-pro-d", divisionLabel: "Pro Women D" },
  "Ivanovo": { teamId: 76034, shortName: "Ivanovo", name: "Ivanovo", tag: "ipbl-66-w-pro-g", divisionLabel: "Pro Women G" },
  "Kostroma": { teamId: 76032, shortName: "Kostroma", name: "Kostroma", tag: "ipbl-66-w-pro-g", divisionLabel: "Pro Women G" },
  "Penza": { teamId: 76035, shortName: "Penza", name: "Penza", tag: "ipbl-66-w-pro-g", divisionLabel: "Pro Women G" },
  "Stary Oskol": { teamId: 76036, shortName: "Stary Oskol", name: "Stary Oskol", tag: "ipbl-66-w-pro-g", divisionLabel: "Pro Women G" },
  "Kursk": { teamId: 76018, shortName: "Kursk", name: "Kursk", tag: "ipbl-66-w-pro-k", divisionLabel: "Pro Women K" },
  "Orenburg": { teamId: 76017, shortName: "Orenburg", name: "Orenburg", tag: "ipbl-66-w-pro-k", divisionLabel: "Pro Women K" },
  "Severodvinsk": { teamId: 76016, shortName: "Severodvinsk", name: "Severodvinsk", tag: "ipbl-66-w-pro-k", divisionLabel: "Pro Women K" },
  "Vologda": { teamId: 76019, shortName: "Vologda", name: "Vologda", tag: "ipbl-66-w-pro-k", divisionLabel: "Pro Women K" },
  }).map(([alias, team]) => [normalizeTeamName(alias), team])
);

export type BookmakerLiveResult = {
  games: ScheduleGame[];
  unmatched: Array<{ eventId: number | null; team1: string; team2: string; reason: string }>;
  receivedEvents: number;
  sourceLeagues: number[];
  sourceFailures: Array<{ leagueId: number; error: string }>;
};

export function normalizeTeamName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(women\)/g, "")
    .replace(/\bwomen\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatMyanmar(epochSeconds: number | null): { scheduledTime: string | null; date: string; time: string } {
  const date = epochSeconds === null ? new Date() : new Date(epochSeconds * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    scheduledTime: epochSeconds === null ? null : date.toISOString(),
    date: `${get("day")}.${get("month")}.${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function periodDuration(period: number): number {
  return period <= 4 ? 600 : 300;
}

export function remainingClock(period: number | null, elapsedGameSeconds: number | null): string | null {
  if (period === null || period < 1 || elapsedGameSeconds === null || elapsedGameSeconds < 0) return null;
  const before = period <= 4 ? (period - 1) * 600 : 2400 + (period - 5) * 300;
  const elapsedInPeriod = Math.max(0, elapsedGameSeconds - before);
  const remaining = Math.max(0, periodDuration(period) - elapsedInPeriod);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function fullScore(event: BookmakerSourceEvent): string | null {
  const periods = (event.SC?.PS ?? [])
    .filter((period) => Number.isFinite(period.Key) && period.Value)
    .sort((a, b) => Number(a.Key) - Number(b.Key))
    .map((period) => {
      const s1 = finiteNumber(period.Value?.S1);
      const s2 = finiteNumber(period.Value?.S2);
      return s1 === null || s2 === null ? null : `${s1}:${s2}`;
    })
    .filter((value): value is string => value !== null);
  return periods.length ? periods.join(",") : null;
}

function toScheduleGame(event: BookmakerSourceEvent, team1: VerifiedTeam, team2: VerifiedTeam): ScheduleGame | null {
  const gameId = finiteNumber(event.I);
  const score1 = finiteNumber(event.SC?.FS?.S1);
  const score2 = finiteNumber(event.SC?.FS?.S2);
  if (gameId === null || score1 === null || score2 === null) return null;
  const period = finiteNumber(event.SC?.CP);
  const elapsed = finiteNumber(event.SC?.TS);
  const start = finiteNumber(event.S);
  const display = formatMyanmar(start);
  return {
    gameId,
    tag: team1.tag,
    status: "Online",
    statusDisplay: event.SC?.CPS || "Live",
    upstreamStatusId: "melbet-live",
    score1,
    score2,
    scoreText: `${score1} : ${score2}`,
    fullScore: fullScore(event),
    localDate: display.date,
    localTime: display.time,
    scheduledTime: display.scheduledTime,
    sourceLocalDate: null,
    sourceLocalTime: null,
    sourceTimeZone: "bookmaker-epoch",
    displayTimeZone: "Asia/Yangon",
    divisionLabel: team1.divisionLabel,
    period,
    timeToGo: remainingClock(period, elapsed),
    timeIsGo: event.SC?.TR === 0 ? 0 : 1,
    isLive: true,
    updatedAt: finiteNumber(event.U) === null ? Date.now() : Number(event.U) * 1000,
    team1: { teamId: team1.teamId, shortName: team1.shortName, name: team1.name },
    team2: { teamId: team2.teamId, shortName: team2.shortName, name: team2.name },
  };
}

export function parseBookmakerLivePayloads(rawPayloads: unknown[]): BookmakerLiveResult {
  const eventsById = new Map<string, BookmakerSourceEvent>();
  const sourceLeagues = new Set<number>();
  for (const raw of rawPayloads) {
    const envelope = raw as BookmakerEnvelope;
    const events = Array.isArray(envelope?.Value) ? envelope.Value : [];
    for (const event of events) {
      if (typeof event.LI === "number") sourceLeagues.add(event.LI);
      const key = `${event.LI ?? "unknown"}:${event.I ?? JSON.stringify(event)}`;
      eventsById.set(key, event);
    }
  }
  const events = [...eventsById.values()];
  const games: ScheduleGame[] = [];
  const unmatched: BookmakerLiveResult["unmatched"] = [];
  for (const event of events) {
    if (event.LI !== 2496666 && !String(event.L ?? "").toLowerCase().includes("ipbl")) continue;
    const rawTeam1 = String(event.O1 ?? "").trim();
    const rawTeam2 = String(event.O2 ?? "").trim();
    const team1 = VERIFIED_TEAM_ALIASES[normalizeTeamName(rawTeam1)];
    const team2 = VERIFIED_TEAM_ALIASES[normalizeTeamName(rawTeam2)];
    if (!team1 || !team2) {
      unmatched.push({ eventId: finiteNumber(event.I), team1: rawTeam1, team2: rawTeam2, reason: "unverified-team" });
      continue;
    }
    if (team1.tag !== team2.tag) {
      unmatched.push({ eventId: finiteNumber(event.I), team1: rawTeam1, team2: rawTeam2, reason: "division-mismatch" });
      continue;
    }
    const game = toScheduleGame(event, team1, team2);
    if (!game) {
      unmatched.push({ eventId: finiteNumber(event.I), team1: rawTeam1, team2: rawTeam2, reason: "incomplete-live-payload" });
      continue;
    }
    games.push(game);
  }
  return {
    games,
    unmatched,
    receivedEvents: events.length,
    sourceLeagues: [...sourceLeagues].sort((a, b) => a - b),
    sourceFailures: [],
  };
}

export function parseBookmakerLivePayload(raw: unknown): BookmakerLiveResult {
  return parseBookmakerLivePayloads([raw]);
}

export async function fetchMelbetLive(): Promise<BookmakerLiveResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const settled = await Promise.allSettled(MELBET_IPBL_LEAGUES.map(async ({ leagueId }) => {
      const response = await fetch(melbetIpblUrl(leagueId), {
        headers: {
          Accept: "application/json",
          "User-Agent": "IPBL-Minimal-Viewer/1.0",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`MelBet league ${leagueId} HTTP ${response.status}`);
      return { leagueId, payload: await response.json() };
    }));

    const payloads: unknown[] = [];
    const sourceFailures: BookmakerLiveResult["sourceFailures"] = [];
    for (let index = 0; index < settled.length; index += 1) {
      const result = settled[index];
      const leagueId = MELBET_IPBL_LEAGUES[index].leagueId;
      if (result.status === "fulfilled") payloads.push(result.value.payload);
      else sourceFailures.push({ leagueId, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
    if (payloads.length === 0) {
      throw new Error(sourceFailures.map(({ leagueId, error }) => `${leagueId}: ${error}`).join("; ") || "MelBet live sources failed");
    }
    const parsed = parseBookmakerLivePayloads(payloads);
    return { ...parsed, sourceFailures };
  } finally {
    clearTimeout(timeout);
  }
}
