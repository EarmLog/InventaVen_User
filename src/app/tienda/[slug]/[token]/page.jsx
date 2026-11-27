"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  MessageCircle,
  PackageOpen,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { formatearFecha, formatearVes } from "@/lib/utilidades/formato";
import { estadoHorario } from "@/lib/utilidades/horario.js";
import { urlTienda } from "@/lib/tiendaPublica";
import TarjetaProductoPublico from "@/components/modules/tienda/TarjetaProductoPublico";
import ModalDetalleProductoPublico from "@/components/modules/tienda/ModalDetalleProductoPublico";
import CompartirBarra from "./CompartirBarra";

export default function PaginaTienda() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const token = String(params?.token || "");
  const [estado, setEstado] = useState("cargando");
  const [datos, setDatos] = useState(null);
  const [mensajeError, setMensajeError] = useState("");
  const [intento, setIntento] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

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

  const productos = useMemo(
    () => (Array.isArray(datos?.productos) ? datos.productos : []),
    [datos]
  );
  const categorias = useMemo(
    () =>
      Array.from(
        new Set(
          productos
            .map((producto) => String(producto.categoria || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [productos]
  );
  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((producto) => {
      const coincideTexto =
        !texto ||
        `${producto.nombre || ""} ${producto.descripcion || ""} ${producto.categoria || ""}`
          .toLowerCase()
          .includes(texto);
      const coincideCategoria =
        !categoria || String(producto.categoria || "") === categoria;
      return coincideTexto && coincideCategoria;
    });
  }, [productos, busqueda, categoria]);

  if (estado === "cargando") {
    return (
      <main className="min-h-screen bg-[var(--superficie-2)] px-3 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="h-16 animate-pulse rounded-2xl bg-[var(--superficie-3)]" />
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {Array.from({ length: 8 }).map((_, indice) => (
              <div
                key={indice}
                className="overflow-hidden rounded-xl border border-[var(--borde)] bg-[var(--superficie)]"
              >
                <div className="aspect-square animate-pulse bg-[var(--superficie-3)]" />
                <div className="space-y-2 p-2.5">
                  <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--superficie-3)]" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--superficie-3)]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--superficie-3)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (estado === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--superficie-2)] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-[var(--texto)]">
            No se pudo abrir la tienda
          </h1>
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

  const telefono = String(datos?.telefono || "").replace(/\D/g, "");
  const enlaceWhatsapp = telefono ? `https://wa.me/${telefono}` : "";
  const enlacePublico = urlTienda(slug, token);
  const detalleTienda = [
    Number(datos?.tasa) > 0 ? `Tasa ${formatearVes(datos.tasa)}/USD` : "",
    datos?.publicadaEn ? `Actualizado ${formatearFecha(datos.publicadaEn)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const estadoAtencion = estadoHorario(datos?.horario) || {};
  const textoHorario = String(estadoAtencion.texto || "").trim();
  const sinHorario = estadoAtencion.etiqueta === "Sin horario";
  const mostrarHorario = sinHorario
    ? Boolean(textoHorario)
    : Boolean(estadoAtencion.etiqueta || textoHorario);
  const abiertoAhora =
    estadoAtencion.abierto === true ||
    estadoAtencion.etiqueta === "Abierto ahora";

  return (
    <main className="min-h-screen bg-[var(--superficie-2)] pb-20 text-[var(--texto)] md:pb-8">
      <header className="sticky top-0 z-30 border-b border-[var(--borde)] bg-[var(--superficie)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white sm:h-10 sm:w-10">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Catálogo en línea
            </p>
            <h1 className="truncate text-sm font-extrabold leading-tight sm:text-base">
              {datos?.nombreNegocio || "Mi negocio"}
            </h1>
            {detalleTienda ? (
              <p className="truncate text-[10px] text-[var(--texto-suave)]">
                {detalleTienda}
              </p>
            ) : null}
            {mostrarHorario ? (
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                {!sinHorario && estadoAtencion.etiqueta ? (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                      abiertoAhora
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    {estadoAtencion.etiqueta}
                  </span>
                ) : null}
                {textoHorario ? (
                  <span className="truncate text-[10px] text-[var(--texto-suave)]">
                    {textoHorario}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <CompartirBarra
            url={enlacePublico}
            nombreNegocio={datos?.nombreNegocio || "esta tienda"}
          />
        </div>

        <div className="mx-auto max-w-7xl px-3 pb-2.5 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar en la tienda"
              className="w-full rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--texto)] outline-none transition placeholder:text-[var(--texto-tenue)] focus:border-emerald-500 focus:bg-[var(--superficie)]"
            />
          </div>
          {categorias.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setCategoria("")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  !categoria
                    ? "bg-emerald-600 text-white"
                    : "border border-[var(--borde)] bg-[var(--superficie)] text-[var(--texto-suave)]"
                }`}
              >
                Todos
              </button>
              {categorias.map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => setCategoria(nombre)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    categoria === nombre
                      ? "bg-emerald-600 text-white"
                      : "border border-[var(--borde)] bg-[var(--superficie)] text-[var(--texto-suave)]"
                  }`}
                >
                  {nombre}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold sm:text-base">Productos</h2>
          <p className="text-[11px] text-[var(--texto-suave)]">
            {productosFiltrados.length}{" "}
            {productosFiltrados.length === 1 ? "resultado" : "resultados"}
          </p>
        </div>

        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--superficie-3)] text-[var(--texto-suave)]">
              <PackageOpen className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold">Todavía no hay productos</p>
            <p className="max-w-md text-xs text-[var(--texto-suave)]">
              Este negocio no tiene productos publicados en este momento.
            </p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] px-6 py-12 text-center">
            <Search className="h-7 w-7 text-[var(--texto-tenue)]" />
            <p className="text-sm font-bold">No encontramos productos</p>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setCategoria("");
              }}
              className="rounded-lg border border-[var(--borde)] px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-[var(--superficie-2)]"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {productosFiltrados.map((producto) => (
              <TarjetaProductoPublico
                key={producto.id || producto.nombre}
                producto={producto}
                onAbrir={setProductoSeleccionado}
              />
            ))}
          </div>
        )}
      </section>

      {enlaceWhatsapp ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--borde)] bg-[var(--superficie)]/95 p-3 backdrop-blur-md md:hidden">
          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow-lg transition active:bg-emerald-800"
          >
            <MessageCircle className="h-4 w-4" />
            Contactar por WhatsApp
          </a>
        </div>
      ) : null}

      <ModalDetalleProductoPublico
        abierto={Boolean(productoSeleccionado)}
        producto={productoSeleccionado}
        contactos={{
          telefono: datos?.telefono,
          telegram: datos?.telegram,
          instagram: datos?.instagram,
          correoContacto: datos?.correoContacto,
          nombreNegocio: datos?.nombreNegocio,
        }}
        onCerrar={() => setProductoSeleccionado(null)}
      />
    </main>
  );
}
