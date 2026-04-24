import { parseCalendarItems, type ScheduleGame } from "./calendar-normalize.js";
import { canonicalDivisionLabel, IPBL_API_BASE, RESULTS_LANG } from "./results-sync-constants.js";

export async function fetchScheduleGamesForMonth(tag: string, year: number, monthIndex: number, options: { timeoutMs?: number } = {}): Promise<ScheduleGame[]> {
  const dayStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const url = `${IPBL_API_BASE}/calendar?tag=${tag}&from=${dayStr}&to=${dayStr}&lang=${RESULTS_LANG}`;
  const controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 60000);

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal,
      });
      if (response.ok) {
        const raw = (await response.json()) as unknown;
        return parseCalendarItems(raw, tag);
      }
      const retriable =
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504 ||
        response.status === 508;
      if (!retriable || attempt === 2) {
        throw new Error(`calendar ${response.status} for ${dayStr} tag=${tag}`);
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  } finally {
    clearTimeout(timeout);
  }
  return [];
}