"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Package,
  ScanBarcode,
  Settings,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { esVentaReportada } from "@/lib/utilidades/ventas";

const ENLACES = [
  { href: "/panel", etiqueta: "Panel", Icono: LayoutDashboard },
  { href: "/panel/inventario", etiqueta: "Inventario", Icono: Boxes },
  { href: "/panel/pos", etiqueta: "Punto de venta", Icono: ScanBarcode },
  { href: "/panel/analisis", etiqueta: "Análisis", Icono: BarChart3 },
  { href: "/panel/fiscal", etiqueta: "Facturación y fiscalidad", Icono: FileText },
  { href: "/panel/proveedores", etiqueta: "Proveedores", Icono: Package },
  { href: "/panel/auditoria", etiqueta: "Auditoría", Icono: ShieldCheck },
  { href: "/panel/pendientes", etiqueta: "Pendientes", Icono: TriangleAlert },
  { href: "/panel/configuracion", etiqueta: "Configuración", Icono: Settings },
];

function Contenido({ perfil, alNavegar }) {
  const pathname = usePathname();
  const dias = Number(perfil?.diasLicencia ?? 0);
  const pendientes =
    useLiveQuery(
      () =>
        db
          ? db.ventas.filter(esVentaReportada).count()
          : 0,
      [],
      0
    ) || 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primario)] text-white shadow-lg shadow-emerald-900/20">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight">InventaVen</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--texto-tenue)]">
            Gestión de negocio
          </p>
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2.5">
        <p className="truncate text-xs font-semibold text-[var(--texto)]">
          {perfil?.nombreNegocio || "Mi negocio"}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--texto-suave)]">
          {perfil?.correo || "Cuenta InventaVen"}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {ENLACES.map(({ href, etiqueta, Icono }) => {
          const activo =
            href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={alNavegar}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                activo
                  ? "bg-[var(--primario)] text-white shadow-sm"
                  : "text-[var(--texto-suave)] hover:bg-[var(--superficie-2)] hover:text-[var(--texto)]",
              ].join(" ")}
            >
              <Icono className="h-[18px] w-[18px]" />
              <span className="flex-1">{etiqueta}</span>
              {etiqueta === "Pendientes" && pendientes > 0 ? (
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    activo
                      ? "bg-white/20 text-white"
                      : "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
                  ].join(" ")}
                >
                  {pendientes}
                </span>
              ) : (
                <ChevronRight
                  className={[
                    "h-4 w-4 transition",
                    activo ? "opacity-90" : "opacity-0 group-hover:opacity-50",
                  ].join(" ")}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-[var(--borde)] bg-[var(--superficie-2)] p-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className={[
              "h-4 w-4",
              dias > 0 ? "text-[var(--primario)]" : "text-[var(--peligro)]",
            ].join(" ")}
          />
          <p className="text-xs font-semibold text-[var(--texto)]">
            {dias > 0 ? `Licencia activa` : "Licencia vencida"}
          </p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--texto-suave)]">
          {dias > 0
            ? `Te quedan ${dias} día${dias === 1 ? "" : "s"} de licencia.`
            : "Tu licencia está en cero. Puedes seguir usando la app."}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--superficie-3)]">
          <div
            className={[
              "h-full rounded-full transition-all",
              dias > 0 ? "bg-[var(--primario)]" : "bg-[var(--peligro)]",
            ].join(" ")}
            style={{ width: `${Math.min(100, Math.max(4, (dias / 30) * 100))}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-[var(--texto-tenue)]">
          Inventario y ventas guardados en este dispositivo.
        </p>
      </div>
    </div>
  );
}

export default function BarraLateral({ abierto, onCerrar, perfil }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--borde)] bg-[var(--superficie)] lg:block">
        <Contenido perfil={perfil} />
      </aside>

      {abierto ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={onCerrar}
            aria-label="Cerrar menú"
          />
          <aside className="deslizar-entrada absolute inset-y-0 left-0 w-[84vw] max-w-xs border-r border-[var(--borde)] bg-[var(--superficie)] shadow-2xl">
            <button
              type="button"
              onClick={onCerrar}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--texto-suave)] hover:bg-[var(--superficie-3)]"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <Contenido perfil={perfil} alNavegar={onCerrar} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
