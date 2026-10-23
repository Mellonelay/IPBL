import assert from "node:assert/strict";
import { canUseCanonicalDirectHistoryFallback } from "../lib/server/supabase-team-history.ts";

assert.equal(canUseCanonicalDirectHistoryFallback("https://canonical.supabase.co", "https://canonical.supabase.co"), true);
assert.equal(canUseCanonicalDirectHistoryFallback("https://canonical.supabase.co/", "https://canonical.supabase.co"), true);
assert.equal(canUseCanonicalDirectHistoryFallback("https://canonical.supabase.co", "https://marketplace.supabase.co"), false);
assert.equal(canUseCanonicalDirectHistoryFallback("http://canonical.supabase.co", "http://canonical.supabase.co"), false);
assert.equal(canUseCanonicalDirectHistoryFallback(undefined, "https://canonical.supabase.co"), false);
assert.equal(canUseCanonicalDirectHistoryFallback("not-a-url", "https://canonical.supabase.co"), false);
console.log("Canonical IPBL Supabase fallback boundary tests passed");
