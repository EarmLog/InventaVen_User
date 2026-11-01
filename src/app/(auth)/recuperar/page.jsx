"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Alerta from "@/components/ui/Alerta";
import { useSesion } from "@/context/SesionContext";

export default function PaginaRecuperar() {
  const { recuperarClave } = useSesion();
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    if (!correo.trim()) {
      setError("Escribe el correo de tu cuenta.");
      return;
    }
    setCargando(true);
    try {
      await recuperarClave(correo);
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="animar-entrada">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--texto-suave)] hover:text-[var(--primario)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al inicio de sesión
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-[var(--texto)]">
        Recupera tu acceso
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--texto-suave)]">
        Escribe el correo de tu cuenta y te enviaremos un enlace seguro para crear
        una nueva contraseña.
      </p>

      {enviado ? (
        <div className="mt-8 space-y-4">
          <Alerta tipo="exito" titulo="Revisa tu correo">
            Si existe una cuenta con <strong>{correo}</strong>, recibirás un enlace
            para restablecer tu contraseña. Revisa también la carpeta de spam.
          </Alerta>
          <Boton variante="secundario" className="w-full" onClick={() => setEnviado(false)}>
            Enviar a otro correo
          </Boton>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-8 space-y-4">
          {error ? <Alerta tipo="error">{error}</Alerta> : null}
          <Campo etiqueta="Correo electrónico" requerido>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
              <Entrada
                type="email"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                placeholder="tu@negocio.com"
                className="pl-9"
                autoComplete="email"
                required
              />
            </div>
          </Campo>
          <Boton type="submit" cargando={cargando} className="w-full" tamano="lg">
            Enviar enlace de recuperación
            <Send className="h-4 w-4" />
          </Boton>
        </form>
      )}
    </div>
  );
}
