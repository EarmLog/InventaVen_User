"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProveedorTasa, useTasa } from "@/context/TasaContext";
import { useSesion } from "@/context/SesionContext";
import BarraLateral from "@/components/layout/BarraLateral";
import BarraSuperior from "@/components/layout/BarraSuperior";
import { asegurarDatosIniciales, configurarBaseDatosUsuario } from "@/lib/db/baseDatos";
import {
  actualizarPreciosPorTasa,
  obtenerAjustes,
} from "@/lib/db/repositorios";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";
import { formatearVes } from "@/lib/utilidades/formato";

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
  const { sesion, perfil, cargandoPerfil, refrescarPerfil } = useSesion();
  const { tasa } = useTasa();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [autoPrecios, setAutoPrecios] = useState(false);
  const ultimaTasaAplicada = useRef(0);

  useEffect(() => {
    if (sesion === null) router.replace("/login");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion) return;
    const userId = sesion.user?.id || "public";
    configurarBaseDatosUsuario(userId).then(() => {
      asegurarDatosIniciales().catch(() => null);
      refrescarPerfil();
      if (sesion.user?.email === "demo.inventaven2026@gmail.com") {
        import("@/lib/db/demoSemilla").then(({ sembrarDatosDemo }) => {
          sembrarDatosDemo().catch(() => null);
        });
      }
    });
  }, [sesion, refrescarPerfil]);

  useEffect(() => {
    let activo = true;
    async function leerAjustes() {
      const ajustes = await obtenerAjustes();
      if (activo) setAutoPrecios(Boolean(ajustes[CLAVES_AJUSTES.ACTUALIZAR_PRECIOS_AUTO]));
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
    if (!autoPrecios || !tasa || !sesion) return;
    if (Math.abs(ultimaTasaAplicada.current - tasa) < 0.0001) return;
    let cancelado = false;
    (async () => {
      try {
        const actualizados = await actualizarPreciosPorTasa(tasa);
        ultimaTasaAplicada.current = tasa;
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
