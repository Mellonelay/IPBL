export function currentMyanmarResultsSelection(now = new Date()): { year: number; monthIndex: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Yangon",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value])
  );
  const year = Number(parts.year);
  const monthIndex = Number(parts.month) - 1;
  return {
    year: Number.isFinite(year) ? year : 2026,
    monthIndex: Number.isFinite(monthIndex) ? monthIndex : 2,
  };
}
