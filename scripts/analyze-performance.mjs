import fs from 'fs';

const BET_HISTORY = 'public/bet_history_clean.json';

async function calculatePerformance() {
    console.log("🔍 [M5] Calculating ROI and Performance Metrics...");
    const bets = JSON.parse(fs.readFileSync(BET_HISTORY, 'utf-8'));
    
    let totalBet = 0;
    let totalWin = 0;

    bets.forEach(b => {
        totalBet += 100; // Mock stake
        if (b.result === 'Win') totalWin += 190; // Mock 1.90 average odds
    });

    const metrics = {
        total_bets: bets.length,
        roi: `${(((totalWin - totalBet) / totalBet) * 100).toFixed(2)}%`,
        net_profit: totalWin - totalBet
    };

    fs.writeFileSync('artifacts/performance_report.json', JSON.stringify(metrics, null, 2));
    console.log(`✅ [M5] Performance calculated: ROI ${metrics.roi}`);
}

calculatePerformance().catch(console.error);