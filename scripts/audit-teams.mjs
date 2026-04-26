import fs from 'fs';
import path from 'path';

const BET_HISTORY = 'public/bet_history_clean.json';

async function generateCanonicalReport() {
    console.log("🔍 [M3] Running Team Name Audit...");
    if (!fs.existsSync(BET_HISTORY)) {
        console.error("❌ Bet history file missing!");
        return;
    }
    const bets = JSON.parse(fs.readFileSync(BET_HISTORY, 'utf-8'));
    
    const uniqueTeams = new Set();
    bets.forEach(b => {
        if (b.team_1) uniqueTeams.add(b.team_1);
        if (b.team_2) uniqueTeams.add(b.team_2);
    });

    const teamArray = Array.from(uniqueTeams);
    const report = {
        total_unique_names: teamArray.length,
        potentially_ambiguous: teamArray.filter(name => name && (name.includes("(W)") || name.includes("Women"))),
        names: teamArray.sort()
    };

    if (!fs.existsSync('artifacts')) fs.mkdirSync('artifacts');
    fs.writeFileSync('artifacts/team_audit_report.json', JSON.stringify(report, null, 2));
    console.log(`✅ [M3] Audit Complete. Found ${teamArray.length} unique teams.`);
}

generateCanonicalReport().catch(console.error);
