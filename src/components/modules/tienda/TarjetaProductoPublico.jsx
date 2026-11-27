"use client";

import { PackageOpen } from "lucide-react";
import { formatearUsd, formatearVes } from "@/lib/utilidades/formato";

function obtenerEtiquetaStock(stock) {
  if (stock === null || stock === undefined || stock === "") return "";
  const numero = Number(stock);
  if (!Number.isFinite(numero)) return "";
  if (numero <= 0) return "Agotado";
  if (numero <= 5) return "Últimas unidades";
  return "";
}

export default function TarjetaProductoPublico({ producto, onAbrir }) {
  const nombre = String(producto?.nombre || "Producto");
  const categoria = String(producto?.categoria || "").trim();
  const imagenUrl = String(producto?.imagenUrl || "").trim();
  const precioVes = Number(producto?.precioVes) || 0;
  const precioUsd = Number(producto?.precioUsd) || 0;
  const etiquetaStock = obtenerEtiquetaStock(producto?.stock);
  const claseStock =
    etiquetaStock === "Agotado"
      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

  return (
    <button
      type="button"
      onClick={() => onAbrir?.(producto)}
      aria-label={`Ver detalles de ${nombre}`}
      aria-haspopup="dialog"
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--borde)] bg-[var(--superficie)] text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--superficie)] active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:shadow-lg"
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-white">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt={nombre}
            loading="lazy"
            className="h-full w-full object-contain p-2"
            onError={(evento) => {
              evento.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--texto-tenue)]">
            <PackageOpen className="h-8 w-8" />
          </div>
        )}
        {categoria ? (
          <span className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-4.5rem)] truncate rounded-md bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm">
            {categoria}
          </span>
        ) : null}
        {etiquetaStock ? (
          <span
            className={`pointer-events-none absolute right-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-md px-2 py-0.5 text-[9px] font-extrabold shadow-sm ${claseStock}`}
          >
            {etiquetaStock}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <h3 className="line-clamp-2 min-h-[2.1rem] text-[12px] font-semibold leading-tight text-[var(--texto)] sm:text-[13px]">
          {nombre}
        </h3>

        <div className="mt-auto pt-1.5">
          <p className="text-[15px] font-extrabold leading-tight text-emerald-700 dark:text-emerald-400 sm:text-base">
            {formatearVes(precioVes)}
          </p>
          <p className="text-[10px] text-[var(--texto-suave)] sm:text-[11px]">
            {formatearUsd(precioUsd)}
          </p>
        </div>
      </div>
    </button>
  );
}
