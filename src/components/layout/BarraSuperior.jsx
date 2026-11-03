"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  DollarSign,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useSesion } from "@/context/SesionContext";
import { useTasa } from "@/context/TasaContext";
import { useTema } from "@/context/TemaContext";
import { formatearFechaHora, formatearVes } from "@/lib/utilidades/formato";

const TITULOS = {
  "/panel": "Panel general",
  "/panel/inventario": "Inventario",
  "/panel/pos": "Punto de venta",
  "/panel/analisis": "Análisis de ventas",
  "/panel/fiscal": "Facturación y fiscalidad",
  "/panel/proveedores": "Proveedores",
  "/panel/auditoria": "Auditoría",
  "/panel/pendientes": "Ventas pendientes",
  "/panel/configuracion": "Configuración",
};

function iniciales(nombre) {
  return String(nombre || "IN")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export default function BarraSuperior({ onAbrirMenu, perfil }) {
  const pathname = usePathname();
  const router = useRouter();
  const { cerrarSesion } = useSesion();
  const { tema, alternarTema } = useTema();
  const { tasa, fechaTasa, cargandoTasa, errorTasa, refrescarTasa } = useTasa();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const contenedorMenu = useRef(null);

  useEffect(() => {
    function alHacerClicFuera(evento) {
      if (contenedorMenu.current && !contenedorMenu.current.contains(evento.target)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", alHacerClicFuera);
    return () => document.removeEventListener("mousedown", alHacerClicFuera);
  }, []);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  const dias = Number(perfil?.diasLicencia ?? 0);

  async function salir() {
    try {
      await cerrarSesion();
      toast.success("Sesión cerrada correctamente.");
      router.replace("/login");
    } catch {
      toast.error("No se pudo cerrar la sesión.");
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--borde)] bg-[var(--superficie)]/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-3 sm:px-5 lg:px-7">
        <button
          type="button"
          onClick={onAbrirMenu}
          className="rounded-xl border border-[var(--borde)] p-2 text-[var(--texto-suave)] transition hover:bg-[var(--superficie-2)] lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
            {TITULOS[pathname] || "InventaVen"}
          </p>
          <p className="hidden truncate text-[11px] text-[var(--texto-suave)] sm:block">
            {perfil?.nombreNegocio || "Gestiona tu negocio"}
          </p>
        </div>

        <button
          type="button"
          onClick={refrescarTasa}
          className="hidden items-center gap-1.5 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-2.5 py-2 text-xs font-semibold text-[var(--texto)] transition hover:border-[var(--primario)]/40 sm:flex"
          title={
            fechaTasa
              ? `Tasa actualizada: ${formatearFechaHora(fechaTasa)}`
              : "Actualizar tasa del dólar"
          }
        >
          <DollarSign className="h-3.5 w-3.5 text-[var(--primario)]" />
          {cargandoTasa && !tasa ? (
            <span className="text-[var(--texto-suave)]">Consultando...</span>
          ) : tasa > 0 ? (
            <span>{formatearVes(tasa)}</span>
          ) : (
            <span className="text-[var(--peligro)]">Sin tasa</span>
          )}
          <RefreshCw
            className={["h-3 w-3 text-[var(--texto-tenue)]", cargandoTasa ? "animate-spin" : ""].join(" ")}
          />
        </button>

        <div
          className={[
            "hidden items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold md:flex",
            dias > 0
              ? "border-[var(--borde)] bg-[var(--superficie-2)] text-[var(--texto)]"
              : "border-[var(--peligro)]/30 bg-[var(--peligro-suave)] text-[var(--peligro)]",
          ].join(" ")}
          title={perfil?.fechaVencimiento ? `Vence: ${formatearFechaHora(perfil.fechaVencimiento)}` : ""}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {dias > 0 ? `${dias} día${dias === 1 ? "" : "s"}` : "Vencida"}
        </div>

        <button
          type="button"
          onClick={alternarTema}
          className="rounded-xl border border-[var(--borde)] p-2 text-[var(--texto-suave)] transition hover:bg-[var(--superficie-2)] hover:text-[var(--texto)]"
          aria-label={tema === "oscuro" ? "Activar modo claro" : "Activar modo oscuro"}
          title={tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
        >
          {tema === "oscuro" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative" ref={contenedorMenu}>
          <button
            type="button"
            onClick={() => setMenuAbierto((valor) => !valor)}
            className="flex items-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] py-1.5 pl-1.5 pr-2 transition hover:bg-[var(--superficie-2)]"
            aria-expanded={menuAbierto}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primario-suave)] text-xs font-bold text-[var(--primario-fuerte)]">
              {iniciales(perfil?.nombreNegocio)}
            </span>
            <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:block">
              {perfil?.nombreNegocio || "Mi negocio"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--texto-suave)]" />
          </button>

          {menuAbierto ? (
            <div className="animar-entrada absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] shadow-xl">
              <div className="border-b border-[var(--borde)] px-4 py-3">
                <p className="truncate text-sm font-semibold">
                  {perfil?.nombreNegocio || "Mi negocio"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--texto-suave)]">
                  {perfil?.correo || ""}
                </p>
                <p className="mt-1.5 text-[10px] text-[var(--texto-tenue)]">
                  {dias > 0
                    ? `Licencia: ${dias} día${dias === 1 ? "" : "s"}`
                    : "Licencia vencida (puedes seguir usando la app)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  router.push("/panel/configuracion");
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-[var(--texto-suave)] hover:bg-[var(--superficie-2)] hover:text-[var(--texto)]"
              >
                <Settings className="h-4 w-4" />
                Configuración y seguridad
              </button>
              <button
                type="button"
                onClick={salir}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-[var(--peligro)] hover:bg-[var(--peligro-suave)]"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {tasa > 0 ? (
        <div className="border-t border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-1 text-center text-[10px] text-[var(--texto-suave)] sm:hidden">
          Dólar hoy: <strong className="text-[var(--texto)]">{formatearVes(tasa)}</strong>
          {errorTasa ? " (tasa guardada)" : ""}
        </div>
      ) : null}
    </header>
  );
}
