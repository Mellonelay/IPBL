/**
 * Browser verification: H2H drawer resolves without brittle exact-text waits.
 *
 * Success when drawer is open, H2H section exists, and after loading finishes either:
 *   - empty state mentions "No prior meetings" (short or long form), or
 *   - at least one [data-testid="h2h-item"], or
 *   - loading node is gone and [data-testid="h2h-list"] is present (stable container)
 *
 * Env:
 *   BASE_URL          default http://127.0.0.1:4873
 *   H2H_TIMEOUT_MS    default 45000
 *   OPEN_LIVE_H2H     default 1 — click first live card H2H (set 0 to skip open; expect drawer already up)
 */
import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:4873").replace(/\/$/, "");
const H2H_TIMEOUT_MS = Number(process.env.H2H_TIMEOUT_MS || 45_000);
const NAV_TIMEOUT = 60_000;
const OPEN_LIVE_H2H = process.env.OPEN_LIVE_H2H !== "0";

function snapshotH2h(page) {
    return page.evaluate(() => {
        const drawer = document.querySelector('[data-testid="game-drawer"]');
        const section = drawer?.querySelector('[data-testid="h2h-section"]');
        const drawerText = drawer?.innerText?.trim() ?? "";
        const h2hText = section?.innerText?.trim() ?? "";
        const loadingEl = drawer?.querySelector('[data-testid="h2h-loading"]');
        const loadingHistoryVisible = !!loadingEl;
        const loadingByText =
            /Loading history/.test(h2hText) || /Loading history/.test(drawerText);
        const items = drawer?.querySelectorAll('[data-testid="h2h-item"]') ?? [];
        const entryCount = items.length;
        const hasEmptyShort = h2hText.includes("No prior meetings");
        const hasEmptyLong = h2hText.includes("No prior meetings in loaded team histories.");
        const listEl = drawer?.querySelector('[data-testid="h2h-list"]');

        let resolved = false;
        let reason = "pending";

        if (!drawer) {
            reason = "no-drawer";
        } else if (!section) {
            reason = "no-h2h-section";
        } else if (loadingHistoryVisible || loadingByText) {
            reason = "loading";
        } else if (entryCount > 0) {
            resolved = true;
            reason = "has-h2h-entries";
        } else if (hasEmptyShort || hasEmptyLong) {
            resolved = true;
            reason = "empty-state-text";
        } else if (listEl) {
            resolved = true;
            reason = "stable-h2h-list-no-loading";
        } else {
            reason = "unresolved";
        }

        return {
            resolved,
            reason,
            loadingHistoryVisible,
            loadingByText,
            entryCount,
            hasEmptyShort,
            hasEmptyLong,
            h2hTextPreview: h2hText.slice(0, 4000),
            drawerTextPreview: drawerText.slice(0, 4000),
        };
    });
}

async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(`${BASE_URL}/?tab=live`, {
            waitUntil: "domcontentloaded",
            timeout: NAV_TIMEOUT,
        });

        if (OPEN_LIVE_H2H) {
            const liveH2h = page.locator('[data-testid="live-card-h2h-button"]').first();
            try {
                await liveH2h.waitFor({ state: "visible", timeout: 20_000 });
                await liveH2h.click();
            } catch {
                await page.goto(`${BASE_URL}/?tab=results`, {
                    waitUntil: "domcontentloaded",
                    timeout: NAV_TIMEOUT,
                });
                const resultsH2h = page.locator('[data-testid="results-calendar-h2h-button"]').first();
                await resultsH2h.waitFor({ state: "visible", timeout: 45_000 });
                await resultsH2h.click();
            }
        }

        await page.waitForSelector('[data-testid="game-drawer"]', { timeout: 15_000 });
        await page.waitForSelector('[data-testid="h2h-section"]', { timeout: 10_000 });

        const deadline = Date.now() + H2H_TIMEOUT_MS;
        let last = null;

        while (Date.now() < deadline) {
            last = await snapshotH2h(page);
            if (last.resolved) {
                console.log("PASS: H2H verification");
                console.log(JSON.stringify({ ...last, baseUrl: BASE_URL, timeoutMs: H2H_TIMEOUT_MS }, null, 2));
                await browser.close();
                process.exit(0);
            }
            await sleep(400);
        }

        console.error("FAIL: H2H verification timed out");
        console.error(
            JSON.stringify(
                {
                    ...last,
                    baseUrl: BASE_URL,
                    timeoutMs: H2H_TIMEOUT_MS,
                    note: "After timeout: drawer/H2H text and loading state captured above.",
                },
                null,
                2
            )
        );
        await browser.close();
        process.exit(1);
    } catch (e) {
        console.error("FAIL: verification error:", e?.message || e);
        try {
            const snap = await snapshotH2h(page).catch(() => null);
            if (snap) console.error(JSON.stringify(snap, null, 2));
        } catch {
            /* ignore */
        }
        await browser.close();
        process.exit(1);
    }
}

main();
