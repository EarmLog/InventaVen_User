"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Alerta from "@/components/ui/Alerta";
import Modal from "@/components/ui/Modal";
import Captcha from "@/components/modules/auth/Captcha";
import { useSesion } from "@/context/SesionContext";

export default function PaginaLogin() {
  const { sesion, iniciarSesion } = useSesion();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [captchaTicket, setCaptchaTicket] = useState("");
  const [versionCaptcha, setVersionCaptcha] = useState(0);
  const [mostrarModalCaptcha, setMostrarModalCaptcha] = useState(false);

  useEffect(() => {
    if (sesion) router.replace("/panel");
  }, [sesion, router]);

  async function realizarLogin(ticketUsar) {
    const ticket = ticketUsar || captchaTicket;
    if (!ticket) return;
    setCargando(true);
    setError("");
    try {
      await iniciarSesion({ correo, contrasena, captcha: ticket });
      toast.success("Bienvenido de vuelta a InventaVen.");
      router.replace("/panel");
    } catch (err) {
      setError(err.message);
      setCaptchaTicket("");
      setVersionCaptcha((valor) => valor + 1);
    } finally {
      setCargando(false);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    if (!correo.trim() || !contrasena) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    if (!captchaTicket) {
      setMostrarModalCaptcha(true);
      return;
    }
    await realizarLogin(captchaTicket);
  }

  return (
    <div className="animar-entrada">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--texto)]">
        Inicia sesión
      </h1>
      <p className="mt-2 text-sm text-[var(--texto-suave)]">
        Tu inventario, ventas y análisis te esperan.
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <Campo etiqueta="Correo electrónico" requerido>
          <div className="relative">
            {!correo ? (
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
            ) : null}
            <Entrada
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder="tu@negocio.com"
              className={correo ? "pl-3" : "pl-10"}
              autoComplete="email"
              required
            />
          </div>
        </Campo>

        <Campo etiqueta="Contraseña" requerido>
          <div className="relative">
            {!contrasena ? (
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
            ) : null}
            <Entrada
              type={verClave ? "text" : "password"}
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              placeholder="Tu contraseña"
              className={contrasena ? "pl-3 pr-10" : "pl-10 pr-10"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setVerClave((valor) => !valor)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--texto-suave)] hover:bg-[var(--superficie-3)]"
              aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Campo>

        <div className="flex items-center justify-end">
          <Link
            href="/recuperar"
            className="text-xs font-semibold text-[var(--primario)] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Boton type="submit" cargando={cargando} className="w-full" tamano="lg">
          Entrar a InventaVen
          <ArrowRight className="h-4 w-4" />
        </Boton>
      </form>

      <Modal
        abierto={mostrarModalCaptcha}
        onCerrar={() => setMostrarModalCaptcha(false)}
        titulo="Verificación de seguridad"
        descripcion="Resuelve la verificación para continuar con tu acceso."
        ancho="sm"
      >
        <Captcha
          key={versionCaptcha}
          onTicket={async (ticket) => {
            if (ticket) {
              setCaptchaTicket(ticket);
              setMostrarModalCaptcha(false);
              await realizarLogin(ticket);
            }
          }}
          disabled={cargando}
        />
      </Modal>

      <p className="mt-6 text-center text-sm text-[var(--texto-suave)]">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-[var(--primario)] hover:underline">
          Crea tu negocio gratis
        </Link>
      </p>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-[var(--texto-tenue)]">
        Al ingresar aceptas que tus datos de inventario y ventas se guardan
        localmente en este dispositivo.
      </p>
    </div>
  );
}
