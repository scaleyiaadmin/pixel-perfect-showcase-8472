import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Banco de dados não conectado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }
  client ??= createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}
