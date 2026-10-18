import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente con la clave secreta de Supabase: salta RLS. Solo para tareas del servidor
// (crear cuentas de acceso, enviar mails programados). Nunca se usa en el navegador.
let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  client ??= createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
