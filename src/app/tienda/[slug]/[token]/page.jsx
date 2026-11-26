"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, MessageCircle, PackageOpen, RefreshCw, Store } from "lucide-react";
import { formatearFecha, formatearUsd, formatearVes } from "@/lib/utilidades/formato";
import { urlTienda } from "@/lib/tiendaPublica";
import CompartirBarra from "./CompartirBarra";

export default function PaginaTienda() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const token = String(params?.token || "");
  const [estado, setEstado] = useState("cargando");
  const [datos, setDatos] = useState(null);
  const [mensajeError, setMensajeError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!slug || !token) {
      setMensajeError("El enlace de la tienda no es válido.");
      setEstado("error");
      return undefined;
    }

    const control = new AbortController();
    setEstado("cargando");
    setMensajeError("");

    fetch(`/api/tienda/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: control.signal,
    })
      .then(async (respuesta) => {
        const contenido = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
          throw new Error(contenido.error || "No se pudo cargar la tienda.");
        }
        return contenido;
      })
      .then((contenido) => {
        setDatos(contenido);
        setEstado("listo");
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setMensajeError(error?.message || "No se pudo cargar la tienda.");
        setEstado("error");
      });

    return () => control.abort();
  }, [slug, token, intento]);

  if (estado === "cargando") {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        <p className="text-sm text-[var(--texto-suave)]">Cargando el catálogo…</p>
      </main>
    );
  }

  if (estado === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="tarjeta w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-[var(--texto)]">No se pudo abrir la tienda</h1>
          <p className="mt-2 text-sm text-[var(--texto-suave)]">{mensajeError}</p>
          <button
            type="button"
            onClick={() => setIntento((valor) => valor + 1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const productos = datos?.productos || [];
  const telefono = String(datos?.telefono || "").replace(/\D/g, "");
  const enlaceWhatsapp = telefono ? `https://wa.me/${telefono}` : "";
  const enlacePublico = urlTienda(slug, token);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="tarjeta overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-8 text-white sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/15 p-3">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-50/80">
                  Catálogo en línea
                </p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                  {datos?.nombreNegocio || "Mi negocio"}
                </h1>
                {datos?.publicadaEn ? (
                  <p className="mt-1 text-xs text-emerald-50/80">
                    Actualizado el {formatearFecha(datos.publicadaEn)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {Number(datos?.tasa) > 0 ? (
                <span className="rounded-xl bg-white/15 px-3 py-2 text-xs font-medium">
                  Tasa: {formatearVes(datos.tasa)} por USD
                </span>
              ) : null}
              {enlaceWhatsapp ? (
                <a
                  href={enlaceWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contactar por WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--borde)] px-5 py-4 sm:px-8">
          <CompartirBarra
            url={enlacePublico}
            nombreNegocio={datos?.nombreNegocio || "esta tienda"}
          />
        </div>
      </header>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--texto)]">Productos</h2>
            <p className="text-xs text-[var(--texto-suave)]">
              {productos.length} {productos.length === 1 ? "producto disponible" : "productos disponibles"}
            </p>
          </div>
        </div>

        {productos.length === 0 ? (
          <div className="tarjeta flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--superficie-3)] text-[var(--texto-suave)]">
              <PackageOpen className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-[var(--texto)]">Todavía no hay productos</p>
            <p className="max-w-md text-xs text-[var(--texto-suave)]">
              Este negocio no tiene productos publicados en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productos.map((producto) => (
              <article
                key={producto.id || producto.nombre}
                className="tarjeta flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--superficie-3)]">
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--texto-tenue)]">
                    <PackageOpen className="h-9 w-9" />
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
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                      {producto.categoria}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-sm font-semibold text-[var(--texto)]">{producto.nombre}</h3>
                  {producto.descripcion ? (
                    <p className="line-clamp-3 text-xs leading-relaxed text-[var(--texto-suave)]">
                      {producto.descripcion}
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-[var(--borde)] pt-3">
                    <div>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatearUsd(producto.precioUsd)}
                      </p>
                      <p className="text-xs text-[var(--texto-suave)]">
                        {formatearVes(producto.precioVes)}
                      </p>
                    </div>
                    {enlaceWhatsapp ? (
                      <a
                        href={`${enlaceWhatsapp}?text=${encodeURIComponent(`Hola, quiero información sobre ${producto.nombre}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Consultar
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
