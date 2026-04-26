import fs from 'fs';

const BET_HISTORY = 'public/bet_history_clean.json';

async function calculatePerformance() {
    console.log("🔍 [M5] Calculating ROI and Performance Metrics...");
    if (!fs.existsSync(BET_HISTORY)) {
        console.error("❌ Bet history file missing!");
        return;
    }
    const bets = JSON.parse(fs.readFileSync(BET_HISTORY, 'utf-8'));
    
    let totalStaked = 0;
    let totalReturned = 0;
    let winCount = 0;

    bets.forEach(b => {
        const stake = b.stake || 0;
        totalStaked += stake;
        
        if (b.bet_status === 'Win') {
            winCount++;
            // If actual_payout is missing, estimate with odds
            totalReturned += b.actual_payout ? Number(b.actual_payout) : (stake * (b.odds || 1.95));
        } else if (b.bet_status === 'Void' || b.bet_status === 'Return') {
            totalReturned += stake;
        }
    });

    const netProfit = totalReturned - totalStaked;
    const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;

    const metrics = {
        total_bets: bets.length,
        win_count: winCount,
        win_rate: `${((winCount / bets.length) * 100).toFixed(2)}%`,
        roi: `${roi.toFixed(2)}%`,
        net_profit: netProfit.toFixed(2),
        total_staked: totalStaked,
        total_returned: totalReturned
    };

    if (!fs.existsSync('artifacts')) fs.mkdirSync('artifacts');
    fs.writeFileSync('artifacts/performance_report.json', JSON.stringify(metrics, null, 2));
    console.log(`✅ [M5] Performance calculated: ROI ${metrics.roi} | Win Rate ${metrics.win_rate}`);
}

calculatePerformance().catch(console.error);
