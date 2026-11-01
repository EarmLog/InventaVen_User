import { createClient } from "@supabase/supabase-js";

export function crearClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    throw new Error("Faltan las variables de servidor de Supabase.");
  }
  return createClient(url, llave, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "InventaVen" },
  });
}

export function extraerToken(request) {
  const autorizacion = request.headers.get("authorization") || "";
  if (!autorizacion.toLowerCase().startsWith("bearer ")) return null;
  const token = autorizacion.slice(7).trim();
  return token || null;
}
