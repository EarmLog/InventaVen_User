"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";

export default function Captcha({ onTicket, disabled = false }) {
  const [desafio, setDesafio] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [ticket, setTicket] = useState("");
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState("");
  const alCambiarTicket = useRef(onTicket);

  useEffect(() => {
    alCambiarTicket.current = onTicket;
  }, [onTicket]);

  const cargarDesafio = useCallback(async (mensaje = "") => {
    setCargando(true);
    setRespuesta("");
    setTicket("");
    setError(mensaje);
    try {
      const respuestaHttp = await fetch("/api/captcha", { cache: "no-store" });
      const datos = await respuestaHttp.json().catch(() => ({}));
      if (!respuestaHttp.ok || !datos.token) {
        throw new Error(datos.error || "No se pudo cargar la verificación.");
      }
      setDesafio(datos);
      alCambiarTicket.current?.("");
    } catch (err) {
      setDesafio(null);
      setError(err.message || "No se pudo cargar la verificación de seguridad.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDesafio();
  }, [cargarDesafio]);

  async function verificar() {
    if (!desafio?.token || !respuesta.trim() || verificando || disabled) return;
    setVerificando(true);
    setError("");
    try {
      const respuestaHttp = await fetch("/api/captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: desafio.token, respuesta }),
      });
      const datos = await respuestaHttp.json().catch(() => ({}));
      if (!respuestaHttp.ok || !datos.ticket) {
        await cargarDesafio(datos.error || "La respuesta de seguridad no es válida.");
        return;
      }
      setTicket(datos.ticket);
      alCambiarTicket.current?.(datos.ticket);
    } catch {
      await cargarDesafio("No se pudo validar el captcha. Revisa tu conexión.");
    } finally {
      setVerificando(false);
    }
  }

  if (ticket) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--primario)]/30 bg-[var(--primario-suave)] px-3 py-2.5 text-xs font-semibold text-[var(--primario-fuerte)]">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Verificación de seguridad completada.
      </div>
    );
  }

  return (
    <Campo etiqueta="Verificación de seguridad" requerido error={error}>
      <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--texto-suave)]">
            <ShieldCheck className="h-4 w-4 text-[var(--primario)]" />
            {cargando ? "Generando desafío..." : desafio?.pregunta || "Desafío no disponible"}
          </p>
          <button
            type="button"
            onClick={() => cargarDesafio()}
            disabled={cargando || verificando || disabled}
            className="rounded-lg p-1.5 text-[var(--texto-suave)] transition hover:bg-[var(--superficie-3)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Generar otro desafío de seguridad"
            title="Generar otro desafío"
          >
            <RefreshCw className={["h-4 w-4", cargando ? "animate-spin" : ""].join(" ")} />
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <Entrada
            value={respuesta}
            onChange={(evento) => setRespuesta(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                verificar();
              }
            }}
            placeholder="Escribe el resultado"
            inputMode="numeric"
            autoComplete="off"
            disabled={cargando || verificando || disabled || !desafio}
            className="min-w-0 flex-1"
          />
          <Boton
            variante="secundario"
            tamano="sm"
            onClick={verificar}
            cargando={verificando}
            disabled={cargando || disabled || !desafio || !respuesta.trim()}
          >
            Verificar
          </Boton>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-[var(--texto-tenue)]">
          Resuelve la operación para demostrar que eres una persona. El desafío vence
          en 5 minutos.
        </p>
      </div>
    </Campo>
  );
}
