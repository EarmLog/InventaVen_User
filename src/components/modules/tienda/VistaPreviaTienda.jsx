"use client";

import { MessageCircle, PackageOpen, Store } from "lucide-react";
import {
  formatearFecha,
  formatearUsd,
  formatearVes,
} from "@/lib/utilidades/formato";

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

  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-[2rem] border border-[var(--borde)] bg-[var(--superficie)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--borde)] bg-[var(--superficie-2)] px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--texto-suave)]">
          Vista en teléfono
        </span>
        <span className="text-[10px] text-[var(--texto-tenue)]">
          {lista.length} {lista.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      <div className="max-h-[640px] overflow-y-auto bg-[var(--superficie-2)] p-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--borde)] bg-[var(--superficie)]">
          <header className="bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-5 text-white">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/15 p-2.5">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-50/80">
                  Catálogo en línea
                </p>
                <h3 className="mt-1 break-words text-lg font-bold">
                  {nombreNegocio || "Mi negocio"}
                </h3>
                {publicadaEn ? (
                  <p className="mt-0.5 text-[10px] text-emerald-50/80">
                    Actualizado el {formatearFecha(publicadaEn)}
                  </p>
                ) : null}
              </div>
            </div>

            {Number(tasa) > 0 ? (
              <p className="mt-3 rounded-lg bg-white/15 px-2.5 py-1.5 text-[10px] font-medium">
                Tasa: {formatearVes(tasa)} por USD
              </p>
            ) : null}

            {enlaceWhatsapp ? (
              <a
                href={enlaceWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Contactar por WhatsApp
              </a>
            ) : null}
          </header>

          <div className="px-3 py-3">
            <div className="mb-2.5 flex items-end justify-between gap-2">
              <p className="text-xs font-bold text-[var(--texto)]">Productos</p>
              <p className="text-[10px] text-[var(--texto-suave)]">
                {lista.length} {lista.length === 1 ? "disponible" : "disponibles"}
              </p>
            </div>

            {lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--borde)] px-4 py-10 text-center">
                <PackageOpen className="h-7 w-7 text-[var(--texto-tenue)]" />
                <p className="text-xs font-semibold text-[var(--texto)]">
                  Todavía no hay productos
                </p>
                <p className="text-[10px] text-[var(--texto-suave)]">
                  Marca productos como visibles y publica la tienda.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {lista.map((producto) => (
                  <article
                    key={producto.id || producto.nombre}
                    className="overflow-hidden rounded-xl border border-[var(--borde)] bg-[var(--superficie)]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--superficie-3)]">
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--texto-tenue)]">
                        <PackageOpen className="h-8 w-8" />
                      </div>
                      {producto.imagenUrl ? (
                        <img
                          src={producto.imagenUrl}
                          alt={producto.nombre}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(evento) => {
                            evento.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      {producto.categoria ? (
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm">
                          {producto.categoria}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-1.5 p-3">
                      <h4 className="text-xs font-semibold text-[var(--texto)]">
                        {producto.nombre}
                      </h4>
                      {producto.descripcion ? (
                        <p className="line-clamp-3 text-[11px] leading-relaxed text-[var(--texto-suave)]">
                          {producto.descripcion}
                        </p>
                      ) : null}
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-[var(--borde)] pt-2">
                        <div>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatearUsd(producto.precioUsd)}
                          </p>
                          <p className="text-[11px] text-[var(--texto-suave)]">
                            {formatearVes(producto.precioVes)}
                          </p>
                        </div>
                        {enlaceWhatsapp ? (
                          <a
                            href={`${enlaceWhatsapp}?text=${encodeURIComponent(
                              `Hola, quiero información sobre ${producto.nombre}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Consultar
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
