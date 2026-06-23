import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBoxScore } from "../client.js";

describe("fetchBoxScore", () => {
    const originalFetch = global.fetch;
    const originalWindow = global.window;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(1000);
        global.fetch = vi.fn();
        global.window = {
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
        } as any;
        // In some environments, AbortController might already be global
        if (!global.AbortController) {
            (global as any).AbortController = class {
                signal = {};
                abort = vi.fn();
            };
        }
    });

    afterEach(() => {
        global.fetch = originalFetch;
        global.window = originalWindow;
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("should return successful state when API returns status 'Ok'", async () => {
        const mockRaw = { data: { status: "Ok" } };
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRaw,
        });

        const result = await fetchBoxScore(123, "tag");

        expect(result.fetchedOk).toBe(true);
        expect(result.apiStatus).toBe("Ok");
        expect(result.raw).toEqual(mockRaw);
        expect(result.fetchedAt).toBeGreaterThan(0);
    });

    it("should return fetchedOk: false when API returns status other than 'Ok'", async () => {
        const mockRaw = { data: { status: "Error" } };
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRaw,
        });

        const result = await fetchBoxScore(123, "tag");

        expect(result.fetchedOk).toBe(false);
        expect(result.apiStatus).toBe("Error");
        expect(result.raw).toEqual(mockRaw);
    });

    it("should return error state when fetch fails (the untested error path)", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        const result = await fetchBoxScore(123, "tag");

        expect(result.fetchedOk).toBe(false);
        expect(result.apiStatus).toBe(null);
        expect(result.raw).toBe(null);
    });

    it("should return error state when response is not ok", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
        });

        const result = await fetchBoxScore(123, "tag");

        expect(result.fetchedOk).toBe(false);
        expect(result.apiStatus).toBe(null);
        expect(result.raw).toBe(null);
    });

    it("should handle missing status in response data", async () => {
        const mockRaw = { data: {} };
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRaw,
        });

        const result = await fetchBoxScore(123, "tag");

        expect(result.fetchedOk).toBe(false);
        expect(result.apiStatus).toBe(null);
        expect(result.raw).toEqual(mockRaw);
    });
});
