import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { trimEnv, applyKvRestEnvAliases, isKvRestConfigured } from '../lib/kv-env.js';

describe('kv-env', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Backup process.env
        originalEnv = { ...process.env };

        // Clear specific env vars we care about to ensure clean slate
        delete process.env["UPSTASH_REDIS_REST_URL"];
        delete process.env["UPSTASH_REDIS_REST_TOKEN"];
        delete process.env["KV_REST_API_URL"];
        delete process.env["KV_REST_API_TOKEN"];
    });

    afterEach(() => {
        // Restore process.env
        process.env = originalEnv;
    });

    describe('trimEnv', () => {
        it('returns undefined for undefined', () => {
            expect(trimEnv(undefined)).toBeUndefined();
        });

        it('returns undefined for empty string or whitespace', () => {
            expect(trimEnv('')).toBeUndefined();
            expect(trimEnv('   ')).toBeUndefined();
        });

        it('returns trimmed string', () => {
            expect(trimEnv('  hello  ')).toBe('hello');
            expect(trimEnv('hello')).toBe('hello');
        });
    });

    describe('applyKvRestEnvAliases', () => {
        it('does nothing when no relevant env vars are set', () => {
            applyKvRestEnvAliases();
            expect(process.env["KV_REST_API_URL"]).toBeUndefined();
            expect(process.env["KV_REST_API_TOKEN"]).toBeUndefined();
        });

        it('copies UPSTASH vars to KV vars when KV vars are missing', () => {
            process.env["UPSTASH_REDIS_REST_URL"] = 'https://upstash-url.com';
            process.env["UPSTASH_REDIS_REST_TOKEN"] = 'upstash-token';

            applyKvRestEnvAliases();

            expect(process.env["KV_REST_API_URL"]).toBe('https://upstash-url.com');
            expect(process.env["KV_REST_API_TOKEN"]).toBe('upstash-token');
        });

        it('does not overwrite existing KV vars with UPSTASH vars', () => {
            process.env["UPSTASH_REDIS_REST_URL"] = 'https://upstash-url.com';
            process.env["UPSTASH_REDIS_REST_TOKEN"] = 'upstash-token';
            process.env["KV_REST_API_URL"] = 'https://kv-url.com';
            process.env["KV_REST_API_TOKEN"] = 'kv-token';

            applyKvRestEnvAliases();

            expect(process.env["KV_REST_API_URL"]).toBe('https://kv-url.com');
            expect(process.env["KV_REST_API_TOKEN"]).toBe('kv-token');
        });

        it('trims values during copying', () => {
            process.env["UPSTASH_REDIS_REST_URL"] = '  https://upstash-url.com  ';
            process.env["UPSTASH_REDIS_REST_TOKEN"] = '  upstash-token  ';

            applyKvRestEnvAliases();

            expect(process.env["KV_REST_API_URL"]).toBe('https://upstash-url.com');
            expect(process.env["KV_REST_API_TOKEN"]).toBe('upstash-token');
        });
    });

    describe('isKvRestConfigured', () => {
        it('returns false when neither KV nor UPSTASH vars are set', () => {
            expect(isKvRestConfigured()).toBe(false);
        });

        it('returns true when only KV vars are set', () => {
            process.env["KV_REST_API_URL"] = 'https://kv-url.com';
            process.env["KV_REST_API_TOKEN"] = 'kv-token';
            expect(isKvRestConfigured()).toBe(true);
        });

        it('returns true when only UPSTASH vars are set (uses alias)', () => {
            process.env["UPSTASH_REDIS_REST_URL"] = 'https://upstash-url.com';
            process.env["UPSTASH_REDIS_REST_TOKEN"] = 'upstash-token';
            expect(isKvRestConfigured()).toBe(true);
        });

        it('returns false when one KV var is missing and no UPSTASH var is present', () => {
            process.env["KV_REST_API_URL"] = 'https://kv-url.com';
            expect(isKvRestConfigured()).toBe(false);

            delete process.env["KV_REST_API_URL"];
            process.env["KV_REST_API_TOKEN"] = 'kv-token';
            expect(isKvRestConfigured()).toBe(false);
        });
    });
});
