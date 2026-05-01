import fs from 'fs';
import path from 'path';

async function auditIdentity() {
  const canonicalMapPath = path.resolve('src/config/canonical_team_map.json');
  const betHistoryPath = path.resolve('public/bet_history_clean.json');

  if (!fs.existsSync(canonicalMapPath)) {
    console.error(`Error: Canonical map not found at ${canonicalMapPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(betHistoryPath)) {
    console.error(`Error: Bet history not found at ${betHistoryPath}`);
    process.exit(1);
  }

  const canonicalMap = JSON.parse(fs.readFileSync(canonicalMapPath, 'utf-8'));
  const betHistory = JSON.parse(fs.readFileSync(betHistoryPath, 'utf-8'));
  
  const canonicalTeams = new Set(Object.keys(canonicalMap));
  const missingTeams = new Set();
  let totalMatches = 0;

  betHistory.forEach(bet => {
    ['team_1', 'team_2'].forEach(key => {
      const team = bet[key];
      if (team) {
        const trimmedTeam = team.trim();
        if (!canonicalTeams.has(trimmedTeam)) {
          missingTeams.add(trimmedTeam);
        }
        totalMatches++;
      }
    });
  });

  if (missingTeams.size > 0) {
    console.log('--- MISSING TEAM IDENTITIES ---');
    Array.from(missingTeams).sort().forEach(team => console.log(`[ ] ${team}`));
    console.log(`\nFound ${missingTeams.size} unique missing team names.`);
  } else {
    console.log('✅ All team identities in bet history are mapped correctly to canonical names.');
    console.log(`Audited ${totalMatches} team instances.`);
  }
}

auditIdentity().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
