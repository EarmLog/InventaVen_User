"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Interruptor from "@/components/ui/Interruptor";
import Alerta from "@/components/ui/Alerta";
import { useSesion } from "@/context/SesionContext";
import { validarContrasena } from "@/lib/seguridad/contrasena";
import {
  limpiarRif,
  limpiarTelefono,
  sinEspacios,
  validarCorreo,
  validarNombreCuenta,
  validarRifVe,
  validarTelefonoVe,
} from "@/lib/seguridad/validaciones";
import {
  SUFIJOS_LEGALES_VE,
  TIPOS_CUENTA,
} from "@/lib/utilidades/constantes";

export default function PaginaRegistro() {
  const { sesion, registrarUsuario } = useSesion();
  const router = useRouter();
  const [formulario, setFormulario] = useState({
    tipoCuenta: "micronegocio",
    nombreNegocio: "",
    negocioRegistrado: false,
    sufijoLegal: "",
    correo: "",
    telefono: "",
    rif: "",
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

  function cambiarTipoCuenta(valor) {
    setFormulario((anterior) => ({
      ...anterior,
      tipoCuenta: valor,
      negocioRegistrado:
        valor === "empresa" ? true : valor === "personal" ? false : anterior.negocioRegistrado,
      sufijoLegal: valor === "personal" ? "" : anterior.sufijoLegal,
      rif: valor === "personal" ? "" : anterior.rif,
    }));
  }

  function cambiarRegistroNegocio(valor) {
    setFormulario((anterior) => ({
      ...anterior,
      negocioRegistrado: valor,
      sufijoLegal: valor ? anterior.sufijoLegal : "",
      rif: valor ? anterior.rif : "",
    }));
  }

  const tipoSeleccionado = TIPOS_CUENTA.find(
    (tipo) => tipo.valor === formulario.tipoCuenta
  );
  const mostrarDatosFiscales =
    formulario.tipoCuenta !== "personal" && formulario.negocioRegistrado;

  async function enviar(evento) {
    evento.preventDefault();
    setError("");

    const errorNombre = validarNombreCuenta(formulario.nombreNegocio);
    if (errorNombre) {
      setError(errorNombre);
      return;
    }
    if (mostrarDatosFiscales && !formulario.sufijoLegal) {
      setError("Selecciona el sufijo legal de tu negocio.");
      return;
    }
    const errorCorreo = validarCorreo(formulario.correo);
    if (errorCorreo) {
      setError(errorCorreo);
      return;
    }
    const errorTelefono = validarTelefonoVe(formulario.telefono);
    if (errorTelefono) {
      setError(errorTelefono);
      return;
    }
    const errorRif = validarRifVe(formulario.rif, { obligatorio: false });
    if (errorRif) {
      setError(errorRif);
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
        telefono: formulario.telefono,
        tipoCuenta: formulario.tipoCuenta,
        negocioRegistrado: formulario.negocioRegistrado,
        sufijoLegal: mostrarDatosFiscales ? formulario.sufijoLegal : "",
        rif: mostrarDatosFiscales ? formulario.rif : "",
      });
      if (datos?.session) {
        toast.success("Tu negocio fue creado. Tienes 30 días gratis.");
        router.replace("/panel");
      } else {
        router.replace("/registro/confirmar");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
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

        <Campo
          etiqueta="Tipo de cuenta"
          requerido
          ayuda={tipoSeleccionado?.descripcion}
        >
          <Selector
            value={formulario.tipoCuenta}
            onChange={(evento) => cambiarTipoCuenta(evento.target.value)}
          >
            {TIPOS_CUENTA.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo
          etiqueta={
            formulario.tipoCuenta === "personal"
              ? "Nombre de la cuenta"
              : "Nombre del negocio"
          }
          requerido
        >
          <div className="relative">
            <Entrada
              value={formulario.nombreNegocio}
              onChange={(evento) => cambiar("nombreNegocio", evento.target.value)}
              placeholder={
                formulario.tipoCuenta === "personal"
                  ? "Ej. María Pérez"
                  : "Ej. Abastos La Esquina"
              }
              maxLength={160}
              required
            />
          </div>
        </Campo>

        {formulario.tipoCuenta !== "personal" ? (
          <div className="rounded-2xl border border-[var(--borde)] bg-[var(--superficie-2)] p-4">
            <Interruptor
              activo={formulario.negocioRegistrado}
              onCambio={cambiarRegistroNegocio}
              disabled={formulario.tipoCuenta === "empresa"}
              etiqueta="Mi negocio está registrado legalmente"
              descripcion={
                formulario.tipoCuenta === "empresa"
                  ? "Las empresas siempre deben indicar su sufijo legal."
                  : "Actívalo si tienes RIF y deseas mostrar el sufijo legal en tus facturas."
              }
            />
            {mostrarDatosFiscales ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Sufijo legal" requerido>
                  <Selector
                    value={formulario.sufijoLegal}
                    onChange={(evento) => cambiar("sufijoLegal", evento.target.value)}
                  >
                    <option value="">Selecciona el sufijo</option>
                    {SUFIJOS_LEGALES_VE.map((sufijo) => (
                      <option key={sufijo.valor} value={sufijo.valor}>
                        {sufijo.etiqueta}
                      </option>
                    ))}
                  </Selector>
                </Campo>
                <Campo
                  etiqueta="RIF del negocio (opcional)"
                  ayuda="Formato venezolano, por ejemplo J-12345678-9."
                >
                  <Entrada
                    value={formulario.rif}
                    onChange={(evento) => cambiar("rif", limpiarRif(evento.target.value))}
                    placeholder="J-12345678-9"
                    maxLength={12}
                    className="font-mono uppercase"
                  />
                </Campo>
              </div>
            ) : null}
          </div>
        ) : null}

        <Campo etiqueta="Correo electrónico" requerido>
          <div className="relative">
            <Entrada
              type="email"
              value={formulario.correo}
              onChange={(evento) => cambiar("correo", sinEspacios(evento.target.value))}
              placeholder="tu@negocio.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              required
            />
          </div>
        </Campo>

        <Campo
          etiqueta="Teléfono (opcional)"
          ayuda="Solo números, sin espacios ni guiones."
        >
          <div className="relative">
            <Entrada
              value={formulario.telefono}
              onChange={(evento) =>
                cambiar("telefono", limpiarTelefono(evento.target.value))
              }
              placeholder="04121234567"
              maxLength={13}
              inputMode="numeric"
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
                placeholder="Mínimo 8 caracteres, sin espacios"
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
