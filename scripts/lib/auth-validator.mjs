import fetch from 'node-fetch';

/**
 * Validates the 1xBet session before a full sync to prevent silent failures.
 */
export async function validateSession(cookie) {
    console.log("🔍 [AUTH] Preflight Session Validation...");
    if (!cookie) return { ok: false, error: "BETHISTORY_COOKIE is missing." };

    try {
        const response = await fetch("https://1xbet.com/office/history/", {
            method: "HEAD",
            headers: { "Cookie": cookie }
        });
        
        if (response.status === 200) {
            console.log("✅ [AUTH] Session is ACTIVE.");
            return { ok: true };
        }
        
        return { ok: false, status: response.status, error: "Session expired or invalid." };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}