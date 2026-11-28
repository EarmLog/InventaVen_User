"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProveedorTasa, useTasa } from "@/context/TasaContext";
import { useConfiguracion } from "@/context/ConfiguracionContext";
import { useSesion } from "@/context/SesionContext";
import { solicitarConfiguracion } from "@/lib/api/auth";
import BarraLateral from "@/components/layout/BarraLateral";
import BarraSuperior from "@/components/layout/BarraSuperior";
import ModalBienvenida from "@/components/modules/onboarding/ModalBienvenida";
import IndicadorConexion from "@/components/ui/IndicadorConexion";
import { asegurarDatosIniciales, configurarBaseDatosUsuario } from "@/lib/db/baseDatos";
import { ejecutarCopiaAutomatica } from "@/lib/db/copiaAutomatica";
import {
  descargarRespaldoNube,
  listarRespaldosNube,
} from "@/lib/db/respaldoNube";
import { restaurarRespaldo } from "@/lib/db/respaldo";
import {
  actualizarPreciosPorTasa,
  actualizarSaldosDeudoresPorTasa,
  guardarAjuste,
  guardarAjustes,
  obtenerAjustes,
} from "@/lib/db/repositorios";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import { formatearVes } from "@/lib/utilidades/formato";
import { tasaEsValida } from "@/lib/utilidades/tasa";

function PantallaCargando({ texto = "Preparando tu panel..." }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primario)] text-white shadow-lg">
        <Boxes className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm text-[var(--texto-suave)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {texto}
      </div>
    </div>
  );
}

function ContenidoPanel({ children }) {
  const router = useRouter();
  const { sesion, perfil, cargandoPerfil, refrescarPerfil, onboardingAbierto, setOnboardingAbierto, abrirOnboarding, cerrarOnboarding, marcarOnboardingCompletado } = useSesion();
  const { tasa } = useTasa();
  const { configuracion, listo, recargar } = useConfiguracion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [autoPrecios, setAutoPrecios] = useState(false);
  const [ultimaTasaAplicada, setUltimaTasaAplicada] = useState(null);
  const copiasHabilitadasRef = useRef(false);
  const autoRestaurado = useRef(false);

  useEffect(() => {
    if (sesion === null) router.replace("/login");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion || !listo) return undefined;
    let activo = true;
    let intervalo = null;
    let restauradoAhora = false;
    let manejarOnline = null;
    let manejarVisibilidad = null;
    const userId = sesion.user?.id || "public";

    (async () => {
      await configurarBaseDatosUsuario(userId);
      if (!activo) return;
      await asegurarDatosIniciales().catch(() => null);

      if (!autoRestaurado.current) {
        autoRestaurado.current = true;
        try {
          const ajustes = await obtenerAjustes();
          if (!ajustes[CLAVES_AJUSTES.ONBOARDING_VISTO]) {
            const copias = await listarRespaldosNube().catch(() => []);
            const ultima = copias[0];
            if (ultima) {
              const blob = await descargarRespaldoNube(ultima.nombre);
              await restaurarRespaldo(blob, { reemplazar: true });
              const datosRestaurados = {
                [CLAVES_AJUSTES.ONBOARDING_VISTO]: true,
                [CLAVES_AJUSTES.COPIA_NUBE_ACTIVA]: true,
                [CLAVES_AJUSTES.COPIA_NUBE_ULTIMA]: ultima.nombre,
                [CLAVES_AJUSTES.COPIA_NUBE_ULTIMA_FECHA]: new Date().toISOString(),
                [CLAVES_AJUSTES.COPIA_NUBE_ULTIMO_ERROR]: "",
              };
              restauradoAhora = true;
              await guardarAjustes(datosRestaurados);
              await solicitarConfiguracion("PATCH", datosRestaurados).catch(() => null);
              await recargar();
              window.dispatchEvent(new Event("inventaven-ajustes"));
              toast.success("Restauramos tus datos desde la última copia en la nube.");
            }
          }
        } catch {
          await guardarAjustes({
            [CLAVES_AJUSTES.COPIA_NUBE_ULTIMO_ERROR]:
              "No se pudo restaurar la copia en la nube.",
          }).catch(() => null);
        }
      }

      if (!activo) return;
      copiasHabilitadasRef.current = true;
      refrescarPerfil();
      if (sesion.user?.email === "demo.inventaven2026@gmail.com" && !restauradoAhora) {
        const ajustesDemo = await obtenerAjustes();
        if (!ajustesDemo[CLAVES_AJUSTES.ONBOARDING_VISTO]) {
          import("@/lib/db/demoSemilla").then(({ sembrarDatosDemo }) => {
            sembrarDatosDemo().catch(() => null);
          });
        }
      }

      const ejecutarCopia = () => {
        if (!copiasHabilitadasRef.current) return;
        ejecutarCopiaAutomatica().catch(() => null);
      };
      manejarOnline = ejecutarCopia;
      manejarVisibilidad = () => {
        if (document.visibilityState === "visible") ejecutarCopia();
      };
      window.addEventListener("online", manejarOnline);
      document.addEventListener("visibilitychange", manejarVisibilidad);
      intervalo = window.setInterval(ejecutarCopia, 60 * 60 * 1000);
      ejecutarCopia();
    })();

    return () => {
      activo = false;
      if (manejarOnline) window.removeEventListener("online", manejarOnline);
      if (manejarVisibilidad) {
        document.removeEventListener("visibilitychange", manejarVisibilidad);
      }
      if (intervalo) window.clearInterval(intervalo);
    };
  }, [sesion, listo, refrescarPerfil, recargar]);

  useEffect(() => {
    let activo = true;
    async function leerAjustes() {
      const ajustes = await obtenerAjustes();
      if (activo) {
        setAutoPrecios(Boolean(ajustes[CLAVES_AJUSTES.ACTUALIZAR_PRECIOS_AUTO]));
        setUltimaTasaAplicada(
          ajustes[CLAVES_AJUSTES.TASA_ULTIMA_APLICADA] != null
            ? Number(ajustes[CLAVES_AJUSTES.TASA_ULTIMA_APLICADA])
            : null
        );
      }
    }
    leerAjustes();
    const alCambiar = () => leerAjustes();
    window.addEventListener("inventaven-ajustes", alCambiar);
    return () => {
      activo = false;
      window.removeEventListener("inventaven-ajustes", alCambiar);
    };
  }, []);

  useEffect(() => {
    if (!sesion || !listo) return;
    setOnboardingAbierto(
      !configuracion[CLAVES_AJUSTES.ONBOARDING_VISTO] && !perfil?.onboardingVisto
    );
  }, [sesion, listo, configuracion, perfil?.onboardingVisto, setOnboardingAbierto]);

  useEffect(() => {
    if (!autoPrecios || !tasa || !sesion) return;
    if (!tasaEsValida(tasa)) return;
    if (ultimaTasaAplicada !== null && Math.abs(ultimaTasaAplicada - tasa) < 0.0001) return;
    if (ultimaTasaAplicada !== null && tasa < ultimaTasaAplicada - 0.0001) {
      toast.info(
        "La tasa bajó. Los precios y saldos no se reducen automáticamente; puedes aplicar la bajada desde Configuración."
      );
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const actualizados = await actualizarPreciosPorTasa(tasa);
        setUltimaTasaAplicada(tasa);
        if (!cancelado && actualizados > 0) {
          toast.info(
            `Precios actualizados en Bs. con la tasa de ${formatearVes(tasa)} (${actualizados} productos).`
          );
        }
      } catch {
        // Si falla, los precios se mantienen tal cual.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [autoPrecios, tasa, sesion]);

  useEffect(() => {
    if (!sesion || !tasa || Number(tasa) <= 0) return;
    actualizarSaldosDeudoresPorTasa(tasa).catch(() => null);
  }, [tasa, sesion]);

  if (sesion === undefined) return <PantallaCargando />;
  if (sesion === null) return <PantallaCargando texto="Redirigiendo al inicio de sesión..." />;
  if (!perfil && cargandoPerfil) return <PantallaCargando texto="Cargando tu licencia..." />;

  const perfilSeguro =
    perfil || {
      nombreNegocio: "Mi negocio",
      correo: sesion.user?.email || "",
      telefono: "",
      diasLicencia: 0,
    };

  return (
    <div className="min-h-screen lg:pl-64">
      <BarraLateral
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        perfil={perfilSeguro}
      />
      <div className="flex min-h-screen flex-col">
        <BarraSuperior onAbrirMenu={() => setMenuAbierto(true)} perfil={perfilSeguro} />
        <main className="flex-1 px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
        <footer className="px-4 pb-5 pt-2 text-center text-[10px] text-[var(--texto-tenue)]">
          InventaVen · Inventario, POS y análisis · Datos guardados localmente en este
          dispositivo
        </footer>
      </div>
      <ModalBienvenida abierto={onboardingAbierto} onCerrar={cerrarOnboarding} />
      <IndicadorConexion />
    </div>
  );
}

export default function LayoutPanel({ children }) {
  return (
    <ProveedorTasa>
      <ContenidoPanel>{children}</ContenidoPanel>
    </ProveedorTasa>
  );
}
