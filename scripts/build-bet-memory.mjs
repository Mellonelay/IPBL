import fs from 'fs';

const BET_HISTORY = 'public/bet_history_clean.json';

async function buildIndex() {
    console.log("🛠️ [B1] Building Betting Memory Index...");
    const bets = JSON.parse(fs.readFileSync(BET_HISTORY, 'utf-8'));
    
    const index = {};
    bets.forEach(b => {
        const key = `${b.team1}-any`;
        if (!index[key]) index[key] = { wins: 0, losses: 0, total: 0 };
        index[key].total++;
        if (b.result === 'Win') index[key].wins++; else index[key].losses++;
    });

    fs.writeFileSync('public/betting_memory_index.json', JSON.stringify(index, null, 2));
    console.log(`✅ [B1] Index Built. Processed ${bets.length} matches.`);
}

buildIndex().catch(console.error);