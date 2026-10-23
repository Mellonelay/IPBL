export type BettingHistoryRow = {
  slip_id: number; placed_at: string; division: string; raw_main_game_id: number;
  team_1: string; team_2: string; quarter: string; market_raw: string;
  odds: number; stake: number; bet_status: string;
};
export function validBetRows(value: unknown): BettingHistoryRow[] {
  if (!Array.isArray(value)) throw new Error("Bet history must be an array");
  const ids = new Set<number>();
  return value.filter((row): row is BettingHistoryRow => {
    if (!row || typeof row !== "object") return false;
    const bet = row as Partial<BettingHistoryRow>;
    if (!Number.isSafeInteger(bet.slip_id) || ids.has(bet.slip_id!) ||
        typeof bet.placed_at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(bet.placed_at) ||
        !Number.isFinite(Date.parse(bet.placed_at)) ||
        !Number.isSafeInteger(bet.raw_main_game_id) ||
        typeof bet.team_1 !== "string" || typeof bet.team_2 !== "string" ||
        typeof bet.division !== "string" ||
        typeof bet.stake !== "number" || !Number.isFinite(bet.stake) || bet.stake < 0 ||
        typeof bet.odds !== "number" || !Number.isFinite(bet.odds) || bet.odds <= 0) return false;
    ids.add(bet.slip_id!); return true;
  });
}
export function availableBetDays(rows: BettingHistoryRow[]): string[] {
  return [...new Set(rows.map(row => row.placed_at.slice(0,10)))].sort().reverse();
}
export function betMatchKey(row: BettingHistoryRow): string {
  return JSON.stringify([row.division,row.raw_main_game_id]);
}
