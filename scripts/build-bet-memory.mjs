import fs from 'fs';
import path from 'path';

const BET_HISTORY = 'public/bet_history_clean.json';
const CANONICAL_MAP = 'src/config/canonical_team_map.json';
const OUTPUT = 'public/betting_memory_index.json';

async function buildIndex() {
    console.log("🛠️ [B1] Building Canonical Betting Memory Index...");
    
    if (!fs.existsSync(BET_HISTORY)) {
        console.error("❌ Bet history file missing!");
        return;
    }
    if (!fs.existsSync(CANONICAL_MAP)) {
        console.error("❌ Canonical map missing!");
        return;
    }

    const bets = JSON.parse(fs.readFileSync(BET_HISTORY, 'utf-8'));
    const canonicalMap = JSON.parse(fs.readFileSync(CANONICAL_MAP, 'utf-8'));
    
    const matchups = {};
    const teams = {};

    bets.forEach(b => {
        if (!b.team_1 || !b.team_2) return;

        const t1 = canonicalMap[b.team_1.trim()];
        const t2 = canonicalMap[b.team_2.trim()];

        if (!t1 || !t2) {
            console.warn(`⚠️  Missing mapping for: ${!t1 ? b.team_1 : ''} ${!t2 ? b.team_2 : ''}`);
            return;
        }

        // 1. Team-level statistics
        [t1, t2].forEach(t => {
            const id = t.teamId;
            if (!teams[id]) teams[id] = { label: t.shortName, wins: 0, losses: 0, total: 0 };
            teams[id].total++;
            if (b.bet_status === 'Win') teams[id].wins++;
            else if (b.bet_status === 'Loss') teams[id].losses++;
        });

        // 2. Matchup-level statistics
        // Key format: "id1_vs_id2" (sorted)
        const matchKey = [t1.teamId, t2.teamId].sort((a, b) => a - b).join('_vs_');
        if (!matchups[matchKey]) {
            matchups[matchKey] = { 
                label: [t1.shortName, t2.shortName].sort().join(' vs '),
                wins: 0, 
                losses: 0, 
                total: 0,
                lastResult: null
            };
        }
        matchups[matchKey].total++;
        if (b.bet_status === 'Win') {
            matchups[matchKey].wins++;
            matchups[matchKey].lastResult = 'Win';
        } else if (b.bet_status === 'Loss') {
            matchups[matchKey].losses++;
            matchups[matchKey].lastResult = 'Loss';
        }
    });

    const finalIndex = {
        timestamp: new Date().toISOString(),
        matchups,
        teams
    };

    fs.writeFileSync(OUTPUT, JSON.stringify(finalIndex, null, 2));
    console.log(`✅ [B1] Canonical Index Built. Processed ${bets.length} bets.`);
    console.log(`📊 Stats: ${Object.keys(matchups).length} matchups, ${Object.keys(teams).length} teams.`);
}

buildIndex().catch(console.error);
