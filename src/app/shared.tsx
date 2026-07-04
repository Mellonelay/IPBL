import type { GameReplay, ScheduleGame } from "../api/types";

export function liveKey(game: ScheduleGame): string {
  return `${game.tag}:${game.gameId}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function statusTone(value: "ALLOW" | "CAUTION" | "BLOCK"): string {
  return value.toLowerCase();
}

export function gameDivision(game: ScheduleGame): "Men" | "Women" {
  return game.tag.includes("-w-") ? "Women" : "Men";
}

export function currentOrNextQuarter(
  flow: { nextQuarter?: string | null } | null,
  board: { currentQuarter?: string | null }
): string | null {
  return flow?.nextQuarter ?? board.currentQuarter ?? null;
}

function formatReplayOdds(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}

export function replayEventSummary(event: GameReplay["timeline"][number]): string {
  if (event.kind === "odds") {
    const line = typeof event.line === "number" && Number.isFinite(event.line) ? event.line.toFixed(1) : "—";
    const over = formatReplayOdds(event.overOdds);
    const under = formatReplayOdds(event.underOdds);
    const bookmaker = typeof event.bookmaker === "string" && event.bookmaker ? event.bookmaker : "unknown";
    const market = typeof event.marketStatus === "string" && event.marketStatus ? event.marketStatus : "unknown";
    return `line ${line} · over ${over} · under ${under} · ${bookmaker} · ${market}`;
  }
  if (event.kind === "quarter") {
    const scoreText = typeof event.scoreText === "string" && event.scoreText ? event.scoreText : "—";
    const fullScore = typeof event.fullScore === "string" && event.fullScore ? event.fullScore : scoreText;
    return `${scoreText} · ${fullScore}`;
  }
  const scoreText = typeof event.scoreText === "string" && event.scoreText ? event.scoreText : "Final";
  const fullScore = typeof event.fullScore === "string" && event.fullScore ? event.fullScore : scoreText;
  return `${scoreText} · ${fullScore}`;
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-box">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
