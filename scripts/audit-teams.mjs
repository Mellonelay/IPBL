import fs from 'fs';
import path from 'path';

const BET_HISTORY = 'public/bet_history_clean.json';

async function generateCanonicalReport() {
    console.log("🔍 [M3] Running Team Name Audit...");
    const bets = JSON.parse(fs.readFileSync(BET_HISTORY, 'utf-8'));
    
    const uniqueTeams = new Set();
    bets.forEach(b => {
        uniqueTeams.add(b.team1);
        uniqueTeams.add(b.team2);
    });

    const report = {
        total_unique_names: uniqueTeams.size,
        potentially_ambiguous: Array.from(uniqueTeams).filter(name => name.includes("(W)") || name.includes("Women")),
        names: Array.from(uniqueTeams).sort()
    };

    fs.writeFileSync('artifacts/team_audit_report.json', JSON.stringify(report, null, 2));
    console.log(`✅ [M3] Audit Complete. Found ${uniqueTeams.size} teams.`);
}

generateCanonicalReport().catch(console.error);