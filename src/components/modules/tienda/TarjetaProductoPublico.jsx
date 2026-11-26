"use client";

import { MessageCircle, PackageOpen } from "lucide-react";
import { formatearUsd, formatearVes } from "@/lib/utilidades/formato";

export default function TarjetaProductoPublico({ producto, enlaceWhatsapp = "" }) {
  const nombre = producto?.nombre || "Producto";
  const categoria = String(producto?.categoria || "").trim();
  const descripcion = String(producto?.descripcion || "").trim();
  const imagenUrl = String(producto?.imagenUrl || "").trim();
  const precioVes = Number(producto?.precioVes) || 0;
  const precioUsd = Number(producto?.precioUsd) || 0;
  const consulta = encodeURIComponent(`Hola, quiero información sobre ${nombre}`);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--borde)] bg-[var(--superficie)] shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:shadow-lg">
      <div className="relative aspect-square w-full overflow-hidden bg-white">
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
          <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm">
            {categoria}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <h3 className="line-clamp-2 min-h-[2.1rem] text-[12px] font-semibold leading-tight text-[var(--texto)] sm:text-[13px]">
          {nombre}
        </h3>
        {descripcion ? (
          <p className="line-clamp-2 text-[10px] leading-snug text-[var(--texto-suave)] sm:text-[11px]">
            {descripcion}
          </p>
        ) : null}

        <div className="mt-auto pt-1.5">
          <p className="text-[15px] font-extrabold leading-tight text-emerald-700 dark:text-emerald-400 sm:text-base">
            {formatearVes(precioVes)}
          </p>
          <p className="text-[10px] text-[var(--texto-suave)] sm:text-[11px]">
            {formatearUsd(precioUsd)}
          </p>
        </div>

        {enlaceWhatsapp ? (
          <a
            href={`${enlaceWhatsapp}?text=${consulta}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700 active:bg-emerald-800"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Consultar
          </a>
        ) : null}
      </div>
    </article>
  );
}
