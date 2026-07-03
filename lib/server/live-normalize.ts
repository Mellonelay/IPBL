import type { ScheduleGame } from "./calendar-normalize.js";

const LIVE_DIVISION_LABELS: Record<string, string> = {
  "ipbl-66-m-pro-a": "Pro Men A",
  "ipbl-66-m-pro-b": "Pro Men B",
  "ipbl-66-m-pro-c": "Pro Men C",
  "ipbl-66-m-pro-d": "Pro Men D",
  "ipbl-66-m-pro-u": "Pro Men U",
  "ipbl-66-m-pro-z": "Pro Men Z",
  "ipbl-66-m-pro-l": "Pro Men L",
  "ipbl-66-w-pro-a": "Pro Women A",
  "ipbl-66-w-pro-b": "Pro Women B",
  "ipbl-66-w-pro-c": "Pro Women C",
  "ipbl-66-w-pro-d": "Pro Women D",
  "ipbl-66-w-pro-g": "Pro Women G",
  "ipbl-66-w-pro-k": "Pro Women K",
};

export function normalizeLiveGame(game: ScheduleGame): ScheduleGame {
  const candidate = game.scheduledTime || (game.localDate && game.localTime
    ? `${game.localDate.split(".").reverse().join("-")}T${game.localTime}:00+05:00`
    : "");
  const date = candidate ? new Date(candidate) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      ...game,
      divisionLabel: LIVE_DIVISION_LABELS[game.tag] ?? game.divisionLabel,
    };
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
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
    divisionLabel: LIVE_DIVISION_LABELS[game.tag] ?? game.divisionLabel,
  };
}
