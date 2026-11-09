"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { obtenerClienteSupabase } from "@/lib/supabase/cliente";

export default function PaginaAuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const gestion = useRef(false);

  useEffect(() => {
    if (gestion.current) return;
    gestion.current = true;
    let activo = true;

    async function resolver() {
      try {
        const supabase = obtenerClienteSupabase();
        const codigo = new URLSearchParams(window.location.search).get("code");
        if (codigo) {
          const { error: errorCodigo } = await supabase.auth.exchangeCodeForSession(codigo);
          if (errorCodigo) throw errorCodigo;
        }
        // Confirmación exitosa: cerramos sesión y mandamos al login
        await supabase.auth.signOut().catch(() => {});
        if (!activo) return;
        setListo(true);
        router.replace("/login?confirmado=1");
        return;
      } catch {
        if (activo) {
          setError("No se pudo completar el inicio de sesión. Solicita un nuevo enlace.");
        }
      }
    }

    resolver();
    return () => {
      activo = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primario)] text-white shadow-lg">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold tracking-tight">
        {listo ? "Sesión lista" : error ? "No se pudo iniciar" : "Confirmando tu cuenta..."}
      </h1>
      <p className="text-sm text-[var(--texto-suave)]">
        {error
          ? error
          : "Estamos verificando tu correo y preparando tu panel. Esto tomará unos segundos."}
      </p>
      {!error && !listo ? (
        <div className="flex items-center gap-2 text-xs text-[var(--texto-suave)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validando enlace de confirmación...
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => router.replace("/login")}
        className="mt-2 text-xs font-semibold text-[var(--primario)] hover:underline"
      >
        Ir al inicio de sesión
      </button>
      {error ? (
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-1 text-xs font-semibold text-[var(--primario)] hover:underline"
        >
          Volver a intentar
        </button>
      ) : null}
      {listo ? (
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-1 text-xs font-semibold text-[var(--primario)] hover:underline"
        >
          Ir al inicio de sesión
        </button>
      ) : null}
    </div>
  );
}
