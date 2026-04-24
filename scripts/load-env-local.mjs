/**
 * Load `.env.local` into process.env (no dependency on dotenv).
 * Strips BOM + CRLF so Windows-edited files work under WSL/bash.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnvLocal() {
    const envPath = path.join(root, ".env.local");
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
    for (let line of text.split(/\n/)) {
        line = line.replace(/\r$/, "").trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
}
