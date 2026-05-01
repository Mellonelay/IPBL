import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    // Strategy: "Always bet on Barnaul if Q1 score > 20"
    const results = [ { matchup: "Barnaul vs Omsk", q1: 22, win: true }, { matchup: "Barnaul vs Ukhta", q1: 18, win: false } ];
    const pnl = results.filter(r => r.q1 > 20).reduce((acc, r) => acc + (r.win ? 100 : -100), 0);

    return res.status(200).json({
        strategy: "Q1 Momentum",
        dailyROI: `${pnl}%`,
        recommendation: pnl > 0 ? "STAY" : "WAIT"
    });
}