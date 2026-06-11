import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCalendarItems, type ScheduleGame } from "../../lib/server/calendar-normalize.js";
import { fetchMelbetLive } from "../../lib/server/bookmaker-live.js";

const PROXY_BASE = "https://worker.mloneslot99.com/ipbl-proxy";
const LIVE_TAGS = [
  "ipbl-66-m-pro-a", "ipbl-66-m-pro-b", "ipbl-66-m-pro-c", "ipbl-66-m-pro-d", "ipbl-66-m-pro-u", "ipbl-74-m-pro-h",
  "ipbl-66-w-pro-a", "ipbl-66-w-pro-b", "ipbl-66-w-pro-c", "ipbl-66-w-pro-d", "ipbl-66-w-pro-g", "ipbl-66-w-pro-k",
] as const;
const LABELS: Record<string, string> = {
  "ipbl-66-m-pro-a": "Pro Men A", "ipbl-66-m-pro-b": "Pro Men B", "ipbl-66-m-pro-c": "Pro Men C",
  "ipbl-66-m-pro-d": "Pro Men D", "ipbl-66-m-pro-u": "Pro Men U", "ipbl-74-m-pro-h": "Pro Men H",
  "ipbl-66-w-pro-a": "Pro Women A", "ipbl-66-w-pro-b": "Pro Women B", "ipbl-66-w-pro-c": "Pro Women C",
  "ipbl-66-w-pro-d": "Pro Women D", "ipbl-66-w-pro-g": "Pro Women G", "ipbl-66-w-pro-k": "Pro Women K",
};

function myanmar(game: ScheduleGame): ScheduleGame {
  const candidate = game.scheduledTime || (game.localDate && game.localTime
    ? `${game.localDate.split(".").reverse().join("-")}T${game.localTime}:00+05:00` : "");
  const date = candidate ? new Date(candidate) : null;
  if (!date || Number.isNaN(date.getTime())) return { ...game, divisionLabel: LABELS[game.tag] ?? game.divisionLabel };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    ...game,
    sourceLocalDate: game.localDate,
    sourceLocalTime: game.localTime,
    sourceTimeZone: "UTC+05:00",
    displayTimeZone: "Asia/Yangon",
    localDate: `${get("day")}.${get("month")}.${get("year")}`,
    localTime: `${get("hour")}:${get("minute")}`,
    divisionLabel: LABELS[game.tag] ?? game.divisionLabel,
  };
}

async function fetchTag(tag: string): Promise<{ tag: string; games: ScheduleGame[]; error?: string }> {
  const url = `${PROXY_BASE}/calendar/online?${new URLSearchParams({ tag, lang: "ru" })}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return { tag, games: [], error: `HTTP ${response.status}` };
    const raw = await response.json();
    return { tag, games: parseCalendarItems(raw, tag).filter((game) => game.isLive).map(myanmar) };
  } catch (error) {
    return { tag, games: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  const batches = await Promise.all(LIVE_TAGS.map(fetchTag));
  const failures = batches.filter((batch) => batch.error).map(({ tag, error }) => ({ tag, error }));
  const byId = new Map<string, ScheduleGame>();
  for (const batch of batches) for (const game of batch.games) byId.set(`${game.tag}:${game.gameId}`, game);
  const officialGames = [...byId.values()].sort((a, b) => a.localTime.localeCompare(b.localTime));

  if (officialGames.length > 0) {
    return res.status(200).json({
      games: officialGames,
      status: {
        lastSyncAt: new Date().toISOString(),
        status: failures.length === 0 ? "OK" : "PARTIAL",
        source: "official:api1.ipbl.pro",
        requestedDivisions: LIVE_TAGS.length,
        successfulDivisions: LIVE_TAGS.length - failures.length,
        failures,
        latencyMs: Date.now() - started,
        displayTimeZone: "Asia/Yangon",
      },
    });
  }

  try {
    const fallback = await fetchMelbetLive();
    const games = fallback.games.sort((a, b) => a.localTime.localeCompare(b.localTime));
    return res.status(200).json({
      games,
      status: {
        lastSyncAt: new Date().toISOString(),
        status: games.length > 0 ? (fallback.unmatched.length > 0 ? "PARTIAL" : "OK") : "FAIL",
        source: "bookmaker:melbet.com",
        fallbackFrom: "official:api1.ipbl.pro",
        requestedDivisions: LIVE_TAGS.length,
        successfulDivisions: new Set(games.map((game) => game.tag)).size,
        failures,
        receivedBookmakerEvents: fallback.receivedEvents,
        unmatchedBookmakerEvents: fallback.unmatched,
        latencyMs: Date.now() - started,
        displayTimeZone: "Asia/Yangon",
      },
    });
  } catch (error) {
    return res.status(200).json({
      games: [],
      status: {
        lastSyncAt: new Date().toISOString(),
        status: "FAIL",
        source: "none",
        fallbackFrom: "official:api1.ipbl.pro",
        requestedDivisions: LIVE_TAGS.length,
        successfulDivisions: 0,
        failures: [
          ...failures,
          { tag: "bookmaker:melbet.com", error: error instanceof Error ? error.message : String(error) },
        ],
        latencyMs: Date.now() - started,
        displayTimeZone: "Asia/Yangon",
      },
    });
  }
}
