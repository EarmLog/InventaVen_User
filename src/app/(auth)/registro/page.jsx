"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Alerta from "@/components/ui/Alerta";
import { useSesion } from "@/context/SesionContext";
import { validarContrasena } from "@/lib/seguridad/contrasena";

export default function PaginaRegistro() {
  const { sesion, registrarUsuario } = useSesion();
  const router = useRouter();
  const [formulario, setFormulario] = useState({
    nombreNegocio: "",
    correo: "",
    telefono: "",
    contrasena: "",
    confirmar: "",
  });
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sesion) router.replace("/panel");
  }, [sesion, router]);

  function cambiar(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }


  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    if (!formulario.nombreNegocio.trim()) {
      setError("Escribe el nombre de tu negocio.");
      return;
    }
    if (!formulario.correo.trim()) {
      setError("Escribe un correo electrónico.");
      return;
    }
    const errorClave = validarContrasena(formulario.contrasena);
    if (errorClave) {
      setError(errorClave);
      return;
    }
    if (formulario.contrasena !== formulario.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const datos = await registrarUsuario({
        correo: formulario.correo,
        contrasena: formulario.contrasena,
        nombreNegocio: formulario.nombreNegocio.trim(),
        telefono: formulario.telefono.trim(),
      });
      if (datos?.session) {
        toast.success("Tu negocio fue creado. Tienes 30 días gratis.");
        router.replace("/panel");
      } else {
        router.replace("/registro/confirmar");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="animar-entrada">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--texto)]">
        Crea tu negocio
      </h1>
      <p className="mt-2 text-sm text-[var(--texto-suave)]">
        Empieza gratis. Tendrás 30 días completos para probar InventaVen.
      </p>

      <form onSubmit={enviar} className="mt-7 space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <Campo etiqueta="Nombre del negocio" requerido>
          <div className="relative">
            <Entrada
              value={formulario.nombreNegocio}
              onChange={(evento) => cambiar("nombreNegocio", evento.target.value)}
              placeholder="Ej. Abastos La Esquina"
              maxLength={160}
              required
            />
          </div>
        </Campo>

        <Campo etiqueta="Correo electrónico" requerido>
          <div className="relative">
            <Entrada
              type="email"
              value={formulario.correo}
              onChange={(evento) => cambiar("correo", evento.target.value)}
              placeholder="tu@negocio.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              required
            />
          </div>
        </Campo>

        <Campo etiqueta="Teléfono (opcional)">
          <div className="relative">
            <Entrada
              value={formulario.telefono}
              onChange={(evento) => cambiar("telefono", evento.target.value)}
              placeholder="+58 412 000 0000"
              maxLength={40}
              autoComplete="tel"
            />
          </div>
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Contraseña" requerido>
            <div className="relative">
              <Entrada
                type={verClave ? "text" : "password"}
                value={formulario.contrasena}
                onChange={(evento) => cambiar("contrasena", evento.target.value)}
                placeholder="Mínimo 8 caracteres, con letra y número"
                className="pr-9"
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
              value={formulario.confirmar}
              onChange={(evento) => cambiar("confirmar", evento.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            maxLength={200}
            required
          />
          </Campo>
        </div>

        <Boton type="submit" cargando={cargando} className="w-full" tamano="lg">
          Crear cuenta gratis
          <ArrowRight className="h-4 w-4" />
        </Boton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--texto-suave)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-[var(--primario)] hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
