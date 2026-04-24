/**
 * @vercel/kv default `kv` client only reads `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
 * Vercel Marketplace / Upstash Redis often injects `UPSTASH_REDIS_REST_*` instead.
 * Apply aliases before any `kv.*` call so both setups work.
 */
export function trimEnv(value: string | undefined): string | undefined {
    const t = value?.trim();
    return t || undefined;
}

export function applyKvRestEnvAliases(): void {
    const upUrl = trimEnv(process.env["UPSTASH_REDIS_REST_URL"]);
    const upTok = trimEnv(process.env["UPSTASH_REDIS_REST_TOKEN"]);
    const kvUrl = trimEnv(process.env["KV_REST_API_URL"]);
    const kvTok = trimEnv(process.env["KV_REST_API_TOKEN"]);

    if (!kvUrl && upUrl) {
        process.env["KV_REST_API_URL"] = upUrl;
    }
    if (!kvTok && upTok) {
        process.env["KV_REST_API_TOKEN"] = upTok;
    }
}

export function isKvRestConfigured(): boolean {
    applyKvRestEnvAliases();
    return Boolean(trimEnv(process.env["KV_REST_API_URL"]) && trimEnv(process.env["KV_REST_API_TOKEN"]));
}
