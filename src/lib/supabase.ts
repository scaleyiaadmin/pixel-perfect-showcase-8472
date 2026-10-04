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
  // No navegador a sessão do login fica guardada e é renovada sozinha. No servidor (SSR)
  // não há login: o cliente é anônimo e não guarda sessão, para não misturar usuários.
  // Sem sessão, as telas públicas continuam lendo como anônimo.
  const noNavegador = typeof window !== "undefined";
  client ??= createClient(url, anonKey, {
    auth: {
      persistSession: noNavegador,
      autoRefreshToken: noNavegador,
      detectSessionInUrl: noNavegador,
      storageKey: "sisrodov-sessao",
    },
  });
  return client;
}
