import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BET_HISTORY_PATH = path.join(PROJECT_ROOT, 'public', 'bet_history_clean.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'betting_memory_index.json');

async function buildIndex() {
    console.log("🔍 Building Betting Memory Index...");
    if (!fs.existsSync(BET_HISTORY_PATH)) {
        console.error("❌ Source file not found: " + BET_HISTORY_PATH);
        process.exit(1);
    }
    
    const rawData = JSON.parse(fs.readFileSync(BET_HISTORY_PATH, 'utf-8'));
    const index = { matchups: {}, lastUpdated: new Date().toISOString() };

    for (const bet of rawData) {
        const key = `${bet.team1}-${bet.team2}`;
        if (!index.matchups[key]) index.matchups[key] = { wins: 0, losses: 0, total: 0 };
        index.matchups[key].total++;
        if (bet.result === 'Win') index.matchups[key].wins++;
        else index.matchups[key].losses++;
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
    console.log("✅ Betting Memory Index created at " + OUTPUT_PATH);
}

buildIndex().catch(console.error);