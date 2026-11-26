"use client";

import { MessageCircle, PackageOpen, Store } from "lucide-react";
import { formatearFecha, formatearVes } from "@/lib/utilidades/formato";
import TarjetaProductoPublico from "./TarjetaProductoPublico";

export default function VistaPreviaTienda({
  nombreNegocio,
  telefono,
  tasa,
  publicadaEn,
  productos,
}) {
  const telefonoLimpio = String(telefono || "").replace(/\D/g, "");
  const enlaceWhatsapp = telefonoLimpio ? `https://wa.me/${telefonoLimpio}` : "";
  const lista = Array.isArray(productos) ? productos : [];
  const detalle = [
    Number(tasa) > 0 ? `Tasa ${formatearVes(tasa)}/USD` : "",
    publicadaEn ? `Actualizado ${formatearFecha(publicadaEn)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-[1.75rem] border border-[var(--borde)] bg-[var(--superficie)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--borde)] bg-[var(--superficie-2)] px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--texto-suave)]">
          Vista en teléfono
        </span>
        <span className="text-[10px] text-[var(--texto-tenue)]">
          {lista.length} {lista.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      <div className="max-h-[660px] overflow-y-auto bg-[var(--superficie-2)] pb-14">
        <header className="sticky top-0 z-10 border-b border-[var(--borde)] bg-[var(--superficie)] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                Catálogo en línea
              </p>
              <h3 className="truncate text-[13px] font-extrabold leading-tight">
                {nombreNegocio || "Mi negocio"}
              </h3>
              {detalle ? (
                <p className="truncate text-[9px] text-[var(--texto-suave)]">
                  {detalle}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="px-3 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-extrabold">Productos</p>
            <p className="text-[9px] text-[var(--texto-suave)]">
              {lista.length} {lista.length === 1 ? "resultado" : "resultados"}
            </p>
          </div>

          {lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--borde)] px-4 py-10 text-center">
              <PackageOpen className="h-7 w-7 text-[var(--texto-tenue)]" />
              <p className="text-xs font-bold">Todavía no hay productos</p>
              <p className="text-[10px] text-[var(--texto-suave)]">
                Marca productos como visibles y publica la tienda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {lista.map((producto) => (
                <TarjetaProductoPublico
                  key={producto.id || producto.nombre}
                  producto={producto}
                  enlaceWhatsapp={enlaceWhatsapp}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {enlaceWhatsapp ? (
        <div className="border-t border-[var(--borde)] bg-[var(--superficie)] p-2.5">
          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-[11px] font-extrabold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Contactar por WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  );
}
