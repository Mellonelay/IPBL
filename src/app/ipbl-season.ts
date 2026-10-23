/** IPBL identifies a season by its ending year (September starts the next season). */
export function seasonForIpblGame(game: {
  sourceLocalDate?: string | null;
  localDate?: string | null;
  scheduledTime?: string | null;
}, fallback: Date = new Date()): number {
  for (const value of [game.sourceLocalDate, game.localDate]) {
    if (!value) continue;
    const source = value.trim();
    const dot = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(source);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source);
    const year = dot ? Number(dot[3]) : iso ? Number(iso[1]) : NaN;
    const month = dot ? Number(dot[2]) : iso ? Number(iso[2]) : NaN;
    const day = dot ? Number(dot[1]) : iso ? Number(iso[3]) : NaN;
    if (Number.isInteger(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day) {
        return year + (month >= 9 ? 1 : 0);
      }
    }
  }
  // No guess from unparseable dates: fall back to current Myanmar season.
  const pieces = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yangon", year: "numeric", month: "numeric" }).formatToParts(fallback);
  const year = Number(pieces.find(x => x.type === "year")?.value);
  const month = Number(pieces.find(x => x.type === "month")?.value);
  return year + (month >= 9 ? 1 : 0);
}
