import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = "C:/All work project/IPBL";
const MISSIONS_DIR = path.join(PROJECT_ROOT, ".jules", "missions");
const CONCURRENCY_LIMIT = 15; // User's Pro limit

async function runAutonomousCycle() {
    console.log("------------------------------------------");
    console.log("🛡️ [SWARM COMMANDER] Multi-Agent Engine Active");
    
    const missions = fs.readdirSync(MISSIONS_DIR).sort();
    const activeMissions = missions.filter(m => m.includes(".in-progress"));
    const pendingMissions = missions.filter(m => m.endsWith(".md") && !m.includes(".completed") && !m.includes(".in-progress"));

    console.log(`📡 Status: ${activeMissions.length} Active, ${pendingMissions.length} Pending`);

    if (activeMissions.length >= CONCURRENCY_LIMIT) {
        console.log("⚠️ Concurrency limit reached. Waiting for sessions to finish.");
        return;
    }

    if (pendingMissions.length === 0 && activeMissions.length === 0) {
        console.log("🏁 ALL MISSIONS ACHIEVED.");
        return;
    }

    // Since our milestones are architecturally dependent, we usually run one at a time.
    // But we can dispatch independent tasks if needed.
    for (const nextMissionFile of pendingMissions) {
        if (activeMissions.length >= CONCURRENCY_LIMIT) break;

        const missionPath = path.join(MISSIONS_DIR, nextMissionFile);
        const spec = fs.readFileSync(missionPath, "utf-8");

        console.log(`🚀 Dispatching Next Mission: ${nextMissionFile}`);

        try {
            // Using the CLI with the assumed authenticated environment
            const cmd = `jules remote new --repo Mellonelay/IPBL --session "${spec.replace(/"/g, '\"')}"`;
            const output = execSync(cmd).toString();
            const sessionIdMatch = output.match(/ID: (\d+)/);
            
            if (sessionIdMatch) {
                fs.renameSync(missionPath, missionPath + ".in-progress");
                console.log(`✅ Session ID: ${sessionIdMatch[1]} launched.`);
            }
        } catch (err) {
            console.error(`❌ Dispatch Failed: ${err.message}`);
        }
    }
}

runAutonomousCycle();