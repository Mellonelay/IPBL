import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

function envValue(name: string): string | null {
  const value = String(process.env[name] ?? "").trim();
  return value || null;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = envValue("SUPABASE_URL");
  const secret = envValue("SUPABASE_SECRET_KEY") ?? envValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}

export function resetSupabaseAdminClientForTests(): void {
  cachedClient = undefined;
}
