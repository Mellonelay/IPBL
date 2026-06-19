import type { ScheduleGame, TeamRef } from "./calendar-normalize.js";

export const MELBET_IPBL_LEAGUES = [
  { leagueId: 2496666, label: "IPBL Pro Men" },
  { leagueId: 2496667, label: "IPBL Pro Women" },
] as const;

type BookmakerSourceName = "melbet" | "1xbet";

type BookmakerSourceConfig = {
  name: BookmakerSourceName;
  baseUrl: string;
  partner: number;
};

const BOOKMAKER_IPBL_SOURCES: readonly BookmakerSourceConfig[] = [
  { name: "melbet", baseUrl: "https://melbet.com", partner: 8 },
  { name: "1xbet", baseUrl: "https://1xbet.com", partner: 25 },
] as const;

function bookmakerPageSlug(leagueId: number): string {
  return leagueId === 2496667 ? "ipbl-pro-division-women" : "ipbl-pro-division";
}

function bookmakerLivePageUrl(baseUrl: string, leagueId: number): string {
  return `${baseUrl}/en/live/basketball/${leagueId}-${bookmakerPageSlug(leagueId)}`;
}

export const MELBET_IPBL_URLS = MELBET_IPBL_LEAGUES.map(({ leagueId }) =>
  bookmakerLivePageUrl(BOOKMAKER_IPBL_SOURCES[0].baseUrl, leagueId)
);
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
    I?: string;
  };
  O1I?: number;
  O2I?: number;
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
  "Anapa": { teamId: 76055, shortName: "Anapa", name: "Anapa", tag: "ipbl-66-m-pro-z", divisionLabel: "Pro Men Z" },
  "Magadan": { teamId: 76054, shortName: "Magadan", name: "Magadan", tag: "ipbl-66-m-pro-z", divisionLabel: "Pro Men Z" },
  "Magada": { teamId: 76054, shortName: "Magadan", name: "Magadan", tag: "ipbl-66-m-pro-z", divisionLabel: "Pro Men Z" },
  "Adler": { teamId: 76072, shortName: "Adler", name: "Adler", tag: "ipbl-66-m-pro-l", divisionLabel: "Pro Men L" },
  "Kurgan": { teamId: 76069, shortName: "Kurgan", name: "Kurgan", tag: "ipbl-66-m-pro-l", divisionLabel: "Pro Men L" },
  "Surgut": { teamId: 76071, shortName: "Surgut", name: "Surgut", tag: "ipbl-66-m-pro-l", divisionLabel: "Pro Men L" },
  "Yakutsk": { teamId: 76070, shortName: "Yakutsk", name: "Yakutsk", tag: "ipbl-66-m-pro-l", divisionLabel: "Pro Men L" },
  "Omsk": { teamId: 134, shortName: "Omsk", name: "Omsk", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
  "Vorkuta": { teamId: 163, shortName: "Vorkuta", name: "Vorkuta", tag: "ipbl-66-m-pro-a", divisionLabel: "Pro Men A" },
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
  unmatched: Array<{
    eventId: number | null; leagueId: number | null; sourceTeam1Id: number | null; sourceTeam2Id: number | null;
    team1: string; team2: string; reason: string; payloadState: "scored" | "prematch" | "live-score-pending" | "incomplete";
  }>;
  receivedEvents: number;
  sourceLeagues: number[];
  sourceFailures: Array<{ leagueId: number; error: string; source?: BookmakerSourceName }>;
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

function payloadState(event: BookmakerSourceEvent): BookmakerLiveResult["unmatched"][number]["payloadState"] {
  if (finiteNumber(event.SC?.FS?.S1) !== null && finiteNumber(event.SC?.FS?.S2) !== null) return "scored";
  const info = `${event.SC?.I ?? ""} ${event.SC?.SLS ?? ""}`.toLowerCase();
  if (info.includes("pre-match") || info.includes("starting in")) return "prematch";
  if (finiteNumber(event.SC?.CP) !== null) return "live-score-pending";
  return "incomplete";
}

function unmatchedEvent(event: BookmakerSourceEvent, team1: string, team2: string, reason: string): BookmakerLiveResult["unmatched"][number] {
  return {
    eventId: finiteNumber(event.I), leagueId: finiteNumber(event.LI),
    sourceTeam1Id: finiteNumber(event.O1I), sourceTeam2Id: finiteNumber(event.O2I),
    team1, team2, reason, payloadState: payloadState(event),
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
      unmatched.push(unmatchedEvent(event, rawTeam1, rawTeam2, "unverified-team"));
      continue;
    }
    if (team1.tag !== team2.tag) {
      unmatched.push(unmatchedEvent(event, rawTeam1, rawTeam2, "division-mismatch"));
      continue;
    }
    const game = toScheduleGame(event, team1, team2);
    if (!game) {
      unmatched.push(unmatchedEvent(event, rawTeam1, rawTeam2, "incomplete-live-payload"));
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

type PageParsedBookmakerGame = {
  leagueId: number;
  gameId: number;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  period: number | null;
  fullScore: string | null;
  statusDisplay: string;
  scheduledTime: string | null;
  pageUrl: string;
};

function stripHtmlComments(value: string): string {
  return value.replace(/<!--[\s\S]*?-->/g, "");
}

function decodeHtmlText(value: string): string {
  return stripHtmlComments(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quarterLabel(period: number | null): string {
  if (period === null || period < 1) return "Live";
  if (period === 1) return "1st quarter";
  if (period === 2) return "2nd quarter";
  if (period === 3) return "3rd quarter";
  if (period === 4) return "4th quarter";
  return `${period}th quarter`;
}

export function parseBookmakerLivePageHtml(html: string, leagueId: number, baseUrl: string): BookmakerLiveResult {
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const startDates = new Map<string, string>();
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const obj = entry as { ["@type"]?: string; url?: string; startDate?: string };
        if (obj["@type"] === "SportsEvent" && typeof obj.url === "string" && typeof obj.startDate === "string") {
          startDates.set(obj.url, obj.startDate);
        }
      }
    } catch {
      // Ignore malformed structured-data blocks and continue with visible DOM parsing.
    }
  }

  const blocks = [...html.matchAll(/<a href="([^"]+\/(\d+)-[^"]+)" class="dashboard-game-block__link"[\s\S]*?<\/a>/g)];
  const parsedGames: PageParsedBookmakerGame[] = [];
  for (const blockMatch of blocks) {
    const block = blockMatch[0];
    const href = blockMatch[1];
    const hrefParts = href.match(/\/en\/live\/basketball\/(\d+)-[^/]+\/(\d+)-[^"]+/);
    if (!hrefParts) continue;
    const blockLeagueId = Number(hrefParts[1]);
    const gameId = Number(hrefParts[2]);
    const pageUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    if (blockLeagueId !== leagueId) continue;

    const cleaned = stripHtmlComments(block);
    const teamNames = [...cleaned.matchAll(/dashboard-game-team-info__name"[^>]*>\s*([^<]+?)\s*</g)]
      .map((match) => decodeHtmlText(match[1]))
      .filter(Boolean);
    const scoreNums = [...cleaned.matchAll(/ui-game-scores__num"[^>]*>(\d+)<\/span>/g)].map((match) => Number(match[1]));
    if (teamNames.length < 2 || scoreNums.length < 2) continue;

    const quarterPairs: string[] = [];
    for (let index = 2; index + 1 < scoreNums.length; index += 2) {
      quarterPairs.push(`${scoreNums[index]}:${scoreNums[index + 1]}`);
    }

    parsedGames.push({
      leagueId: blockLeagueId,
      gameId: gameId > 0 ? gameId : Number.NaN,
      team1: teamNames[0],
      team2: teamNames[1],
      score1: scoreNums[0],
      score2: scoreNums[1],
      period: quarterPairs.length > 0 ? quarterPairs.length : null,
      fullScore: quarterPairs.length > 0 ? quarterPairs.join(",") : null,
      statusDisplay: quarterLabel(quarterPairs.length > 0 ? quarterPairs.length : null),
      scheduledTime: startDates.get(pageUrl) ?? null,
      pageUrl,
    });
  }

  const games: ScheduleGame[] = [];
  const unmatched: BookmakerLiveResult["unmatched"] = [];
  for (const game of parsedGames.filter((item) => Number.isFinite(item.gameId))) {
    const team1 = VERIFIED_TEAM_ALIASES[normalizeTeamName(game.team1)];
    const team2 = VERIFIED_TEAM_ALIASES[normalizeTeamName(game.team2)];
    if (!team1 || !team2) {
      unmatched.push({
        eventId: game.gameId,
        leagueId,
        sourceTeam1Id: null,
        sourceTeam2Id: null,
        team1: game.team1,
        team2: game.team2,
        reason: "unverified-team",
        payloadState: "scored",
      });
      continue;
    }
    if (team1.tag !== team2.tag) {
      unmatched.push({
        eventId: game.gameId,
        leagueId,
        sourceTeam1Id: team1.teamId,
        sourceTeam2Id: team2.teamId,
        team1: game.team1,
        team2: game.team2,
        reason: "division-mismatch",
        payloadState: "scored",
      });
      continue;
    }
    const display = game.scheduledTime ? formatMyanmar(Math.floor(new Date(game.scheduledTime).getTime() / 1000)) : formatMyanmar(null);
    games.push({
      gameId: game.gameId,
      tag: team1.tag,
      status: "Online",
      statusDisplay: game.statusDisplay,
      upstreamStatusId: "bookmaker-live-page",
      score1: game.score1,
      score2: game.score2,
      scoreText: `${game.score1} : ${game.score2}`,
      fullScore: game.fullScore,
      localDate: display.date,
      localTime: display.time,
      scheduledTime: game.scheduledTime,
      sourceLocalDate: null,
      sourceLocalTime: null,
      sourceTimeZone: "bookmaker-epoch",
      displayTimeZone: "Asia/Yangon",
      divisionLabel: team1.divisionLabel,
      period: game.period,
      timeToGo: null,
      timeIsGo: 1,
      isLive: true,
      updatedAt: Date.now(),
      team1: { teamId: team1.teamId, shortName: team1.shortName, name: team1.name },
      team2: { teamId: team2.teamId, shortName: team2.shortName, name: team2.name },
    });
  }

  return {
    games,
    unmatched,
    receivedEvents: games.length + unmatched.length,
    sourceLeagues: [leagueId],
    sourceFailures: [],
  };
}

async function fetchBookmakerSourceLive(source: BookmakerSourceConfig): Promise<BookmakerLiveResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const settled = await Promise.allSettled(MELBET_IPBL_LEAGUES.map(async ({ leagueId }) => {
      const response = await fetch(bookmakerLivePageUrl(source.baseUrl, leagueId), {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": `IPBL-Minimal-Viewer/1.0 (${source.name})`,
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${source.name} league ${leagueId} HTTP ${response.status}`);
      return { leagueId, payload: await response.text() };
    }));

    const sourceFailures: BookmakerLiveResult["sourceFailures"] = [];
    const games: ScheduleGame[] = [];
    const unmatched: BookmakerLiveResult["unmatched"] = [];
    const sourceLeagues = new Set<number>();
    for (let index = 0; index < settled.length; index += 1) {
      const result = settled[index];
      const leagueId = MELBET_IPBL_LEAGUES[index].leagueId;
      sourceLeagues.add(leagueId);
      if (result.status === "rejected") {
        sourceFailures.push({ leagueId, error: result.reason instanceof Error ? result.reason.message : String(result.reason), source: source.name });
        continue;
      }
      const parsed = parseBookmakerLivePageHtml(result.value.payload, leagueId, source.baseUrl);
      games.push(...parsed.games);
      unmatched.push(...parsed.unmatched);
    }
    if (games.length === 0) {
      throw new Error(sourceFailures.map(({ leagueId, error }) => `${leagueId}: ${error}`).join("; ") || `${source.name} live sources failed`);
    }
    return {
      games,
      unmatched,
      receivedEvents: games.length + unmatched.length,
      sourceLeagues: [...sourceLeagues].sort((a, b) => a - b),
      sourceFailures,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function timestampByGameId(game: ScheduleGame): number {
  return typeof game.updatedAt === "number" && Number.isFinite(game.updatedAt) ? game.updatedAt : 0;
}

export function mergeBookmakerLiveResultsByGameId(results: BookmakerLiveResult[]): BookmakerLiveResult {
  const byGameId = new Map<number, ScheduleGame>();
  const unmatched: BookmakerLiveResult["unmatched"] = [];
  const sourceLeagues = new Set<number>();
  const sourceFailures: BookmakerLiveResult["sourceFailures"] = [];
  let receivedEvents = 0;

  for (const result of results) {
    receivedEvents += result.receivedEvents;
    for (const leagueId of result.sourceLeagues) sourceLeagues.add(leagueId);
    unmatched.push(...result.unmatched);
    sourceFailures.push(...result.sourceFailures);
    for (const game of result.games) {
      const existing = byGameId.get(game.gameId);
      if (!existing || timestampByGameId(game) >= timestampByGameId(existing)) byGameId.set(game.gameId, game);
    }
  }

  return {
    games: [...byGameId.values()].sort((a, b) => a.localTime.localeCompare(b.localTime)),
    unmatched,
    receivedEvents,
    sourceLeagues: [...sourceLeagues].sort((a, b) => a - b),
    sourceFailures,
  };
}

export async function fetchMelbetLive(): Promise<BookmakerLiveResult> {
  return fetchBookmakerSourceLive(BOOKMAKER_IPBL_SOURCES[0]);
}

export async function fetch1xbetLive(): Promise<BookmakerLiveResult> {
  return fetchBookmakerSourceLive(BOOKMAKER_IPBL_SOURCES[1]);
}

export async function fetchBookmakerLive(): Promise<BookmakerLiveResult> {
  const settled = await Promise.allSettled([fetchMelbetLive(), fetch1xbetLive()]);
  const successes = settled.filter((entry): entry is PromiseFulfilledResult<BookmakerLiveResult> => entry.status === "fulfilled").map((entry) => entry.value);
  const failures = settled.flatMap((entry, index) => {
    if (entry.status === "fulfilled") return [];
    return [{ leagueId: -1, error: entry.reason instanceof Error ? entry.reason.message : String(entry.reason), source: BOOKMAKER_IPBL_SOURCES[index].name }];
  });
  if (successes.length === 0) {
    throw new Error(failures.map(({ source, error }) => `${source ?? "bookmaker"}: ${error}`).join("; ") || "Bookmaker live sources failed");
  }
  const merged = mergeBookmakerLiveResultsByGameId(successes);
  return {
    ...merged,
    sourceFailures: [...merged.sourceFailures, ...failures],
  };
}
