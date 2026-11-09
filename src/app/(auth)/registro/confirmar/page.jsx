"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Alerta from "@/components/ui/Alerta";
import { useSesion } from "@/context/SesionContext";

export default function PaginaConfirmarRegistro() {
  const { reenviarConfirmacion } = useSesion();
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function reenviar(evento) {
    evento.preventDefault();
    setError("");
    if (!correo.trim()) {
      setError("Escribe el correo electrónico con el que te registraste.");
      return;
    }
    setCargando(true);
    try {
      await reenviarConfirmacion(correo);
      setEnviado(true);
      toast.success("Correo de confirmación reenviado.");
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

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primario)] text-white shadow-lg mb-6">
        <Mail className="h-7 w-7" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-[var(--texto)]">
        Revisa tu correo electrónico
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--texto-suave)]">
        Hemos enviado un enlace de confirmación a tu bandeja de entrada. Haz clic en el enlace para activar tu cuenta y comenzar tus 30 días gratis en InventaVen.
      </p>

      {error ? (
        <div className="mt-6">
          <Alerta tipo="error">{error}</Alerta>
        </div>
      ) : null}

      {enviado ? (
        <div className="mt-6 space-y-4">
          <Alerta tipo="exito" titulo="Correo reenviado">
            Hemos enviado un nuevo enlace de confirmación a <strong>{correo}</strong>. Revisa también tu carpeta de spam.
          </Alerta>
          <Boton
            variante="secundario"
            className="w-full"
            onClick={() => setEnviado(false)}
          >
            Reenviar a otro correo
          </Boton>
        </div>
      ) : (
        <form onSubmit={reenviar} className="mt-8 space-y-4">
          <Campo etiqueta="Correo electrónico de registro" requerido>
            <Entrada
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder="tu@negocio.com"
              autoComplete="email"
              required
            />
          </Campo>
          <Boton type="submit" cargando={cargando} className="w-full" tamano="lg">
            Reenviar correo de confirmación
            <RefreshCw className="h-4 w-4" />
          </Boton>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-[var(--texto-suave)]">
        ¿Ya confirmaste tu cuenta?{" "}
        <Link href="/login" className="font-semibold text-[var(--primario)] hover:underline">
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
}
