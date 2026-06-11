/**
 * Map Upstash (`UPSTASH_REDIS_REST_*`) onto `KV_REST_*` for a single client config shape.
 * Named distinctly from repo root `lib/kv-env.ts` so Vercel's serverless bundler does not
 * merge or resolve the wrong module (observed: FUNCTION_INVOCATION_FAILED when importing `api/lib/kv-env.ts`).
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