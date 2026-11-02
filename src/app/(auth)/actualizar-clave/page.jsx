"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Alerta from "@/components/ui/Alerta";
import Cargando from "@/components/ui/Cargando";
import { useSesion } from "@/context/SesionContext";
import { validarContrasena } from "@/lib/seguridad/contrasena";

export default function PaginaActualizarClave() {
  const { sesion, cambiarClave } = useSesion();
  const router = useRouter();
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [segundos, setSegundos] = useState(15);

  useEffect(() => {
    if (sesion !== null || segundos <= 0) return undefined;
    const temporizador = window.setTimeout(() => setSegundos((valor) => valor - 1), 1000);
    return () => window.clearTimeout(temporizador);
  }, [sesion, segundos]);

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    const errorClave = validarContrasena(nueva);
    if (errorClave) {
      setError(errorClave);
      return;
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      await cambiarClave(nueva);
      toast.success("Contraseña actualizada correctamente.");
      router.replace("/panel");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (sesion === undefined || (sesion === null && segundos > 0)) {
    return <Cargando texto="Validando el enlace de recuperación..." />;
  }

  if (!sesion) {
    return (
      <div className="animar-entrada">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--texto-suave)] hover:text-[var(--primario)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio de sesión
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Enlace no válido o vencido</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--texto-suave)]">
          Este enlace ya no está activo. Solicita uno nuevo desde la pantalla de
          recuperación de contraseña.
        </p>
        <Link href="/recuperar">
          <Boton className="mt-6 w-full" tamano="lg">
            Solicitar otro enlace
          </Boton>
        </Link>
      </div>
    );
  }

  return (
    <div className="animar-entrada">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--texto)]">
        Nueva contraseña
      </h1>
      <p className="mt-2 text-sm text-[var(--texto-suave)]">
        Crea una contraseña segura para tu cuenta de InventaVen.
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        <Campo etiqueta="Nueva contraseña" requerido>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
            <Entrada
              type={verClave ? "text" : "password"}
              value={nueva}
              onChange={(evento) => setNueva(evento.target.value)}
              className="pl-9 pr-10"
              placeholder="Mínimo 8 caracteres, con letra y número"
              autoComplete="new-password"
              maxLength={200}
              required
            />
            <button
              type="button"
              onClick={() => setVerClave((valor) => !valor)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--texto-suave)] hover:bg-[var(--superficie-3)]"
              aria-label="Mostrar u ocultar contraseña"
            >
              {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Campo>
        <Campo etiqueta="Confirmar contraseña" requerido>
          <Entrada
            type={verClave ? "text" : "password"}
            value={confirmar}
            onChange={(evento) => setConfirmar(evento.target.value)}
            placeholder="Repite la nueva contraseña"
            autoComplete="new-password"
            maxLength={200}
            required
          />
        </Campo>
        <Boton type="submit" cargando={cargando} className="w-full" tamano="lg">
          Guardar nueva contraseña
        </Boton>
      </form>
    </div>
  );
}
