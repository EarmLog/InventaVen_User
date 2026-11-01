import { createClient } from "@supabase/supabase-js";

let clienteSupabase = null;

export function obtenerClienteSupabase() {
  if (clienteSupabase) return clienteSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !llave) {
    throw new Error("Faltan las variables públicas de Supabase.");
  }
  clienteSupabase = createClient(url, llave, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "inventaven-sesion",
    },
  });
  return clienteSupabase;
}
