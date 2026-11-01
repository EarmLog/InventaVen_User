"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  Boxes,
  PackageOpen,
  Search,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/baseDatos";
import { useTasa } from "@/context/TasaContext";
import { useSesion } from "@/context/SesionContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import Modal from "@/components/ui/Modal";
import PanelCarrito from "@/components/modules/pos/PanelCarrito";
import ModalCobro from "@/components/modules/pos/ModalCobro";
import ModalFactura from "@/components/modules/pos/ModalFactura";
import { PORCENTAJE_IVA } from "@/lib/utilidades/constantes";
import {
  calcularDescuentoOferta,
  etiquetaEmpaque,
  precioUnitarioVariante,
} from "@/lib/utilidades/precios";
import {
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  redondear,
} from "@/lib/utilidades/formato";

export default function PaginaPOS() {
  const { tasa } = useTasa();
  const { perfil } = useSesion();
  const productos =
    useLiveQuery(() => (db ? db.productos.toArray() : []), [], []) || [];
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [carrito, setCarrito] = useState([]);
  const [productoVariante, setProductoVariante] = useState(null);
  const [cobrando, setCobrando] = useState(false);
  const [carritoMovil, setCarritoMovil] = useState(false);
  const [factura, setFactura] = useState(null);
  const [aplicarIva, setAplicarIva] = useState(true);

  const activos = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos]
  );
  const categorias = useMemo(
    () => [...new Set(activos.map((producto) => producto.categoria).filter(Boolean))].sort(),
    [activos]
  );
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return activos.filter((producto) => {
      const coincideBusqueda =
        !termino ||
        producto.nombre.toLowerCase().includes(termino) ||
        producto.sku.toLowerCase().includes(termino) ||
        (producto.variantes || []).some(
          (variante) =>
            variante.nombre.toLowerCase().includes(termino) ||
            variante.sku.toLowerCase().includes(termino)
        );
      const coincideCategoria =
        categoria === "todas" || producto.categoria === categoria;
      return coincideBusqueda && coincideCategoria;
    });
  }, [activos, busqueda, categoria]);

  const lineas = useMemo(() => {
    return carrito
      .map((item) => {
        const producto = productos.find((registro) => registro.id === item.productoId);
        if (!producto || producto.activo === false) return null;
        const variante = item.varianteId
          ? (producto.variantes || []).find((registro) => registro.id === item.varianteId)
          : null;
        if (item.varianteId && !variante) return null;
        if (!item.varianteId && (producto.variantes || []).length > 0) return null;
        const precios = precioUnitarioVariante(producto, variante);
        const descuentoPct = producto.ofertaActiva
          ? calcularDescuentoOferta(
              item.cantidad,
              producto.ofertaCantidad,
              producto.ofertaDescuento
            )
          : 0;
        const subtotalUsd = redondear(precios.usd * item.cantidad);
        const subtotalVes = redondear(precios.ves * item.cantidad);
        const descuentoUsd = redondear((subtotalUsd * descuentoPct) / 100);
        const descuentoVes = redondear((subtotalVes * descuentoPct) / 100);
        return {
          clave: item.clave,
          productoId: producto.id,
          varianteId: variante?.id || null,
          nombre: producto.nombre,
          variante: variante?.nombre || null,
          sku: variante?.sku || producto.sku,
          cantidad: item.cantidad,
          precioUsd: precios.usd,
          precioVes: precios.ves,
          descuentoPct,
          subtotalUsd,
          subtotalVes,
          descuentoUsd,
          descuentoVes,
          totalUsd: redondear(subtotalUsd - descuentoUsd),
          totalVes: redondear(subtotalVes - descuentoVes),
          stockDisponible: Number(variante ? variante.stock : producto.stock) || 0,
        };
      })
      .filter(Boolean);
  }, [carrito, productos]);

  const totales = useMemo(() => {
    const baseUsd = redondear(
      lineas.reduce((total, linea) => total + linea.totalUsd, 0)
    );
    const baseVes = redondear(
      lineas.reduce((total, linea) => total + linea.totalVes, 0)
    );
    const ivaUsd = aplicarIva
      ? redondear((baseUsd * PORCENTAJE_IVA) / 100)
      : 0;
    const ivaVes = aplicarIva
      ? redondear((baseVes * PORCENTAJE_IVA) / 100)
      : 0;

    return {
      subtotalUsd: redondear(lineas.reduce((total, linea) => total + linea.subtotalUsd, 0)),
      subtotalVes: redondear(lineas.reduce((total, linea) => total + linea.subtotalVes, 0)),
      descuentoUsd: redondear(lineas.reduce((total, linea) => total + linea.descuentoUsd, 0)),
      descuentoVes: redondear(lineas.reduce((total, linea) => total + linea.descuentoVes, 0)),
      baseUsd,
      baseVes,
      ivaUsd,
      ivaVes,
      porcentajeIva: aplicarIva ? PORCENTAJE_IVA : 0,
      totalUsd: redondear(baseUsd + ivaUsd),
      totalVes: redondear(baseVes + ivaVes),
    };
  }, [lineas, aplicarIva]);

  const unidades = lineas.reduce((total, linea) => total + linea.cantidad, 0);

  function agregar(producto, variante = null) {
    const stock = Number(variante ? variante.stock : producto.stock) || 0;
    if (stock <= 0) {
      toast.error("Este producto no tiene stock disponible.");
      return;
    }
    const clave = `${producto.id}::${variante?.id || "base"}`;
    const existente = carrito.find((item) => item.clave === clave);
    const cantidadActual = existente?.cantidad || 0;
    if (cantidadActual + 1 > stock) {
      toast.error(`Solo hay ${formatearNumero(stock)} disponibles de ${producto.nombre}.`);
      return;
    }
    setCarrito((anterior) => {
      if (existente) {
        return anterior.map((item) =>
          item.clave === clave ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...anterior,
        { clave, productoId: producto.id, varianteId: variante?.id || null, cantidad: 1 },
      ];
    });
    setProductoVariante(null);
    toast.success(`${producto.nombre} agregado al carrito.`, { duration: 1200 });
  }

  function alTocarProducto(producto) {
    if ((producto.variantes || []).length > 0) {
      setProductoVariante(producto);
      return;
    }
    agregar(producto);
  }

  function cambiarCantidad(clave, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
      quitar(clave);
      return;
    }
    const linea = lineas.find((registro) => registro.clave === clave);
    if (!linea) return;
    if (nuevaCantidad > linea.stockDisponible) {
      toast.error(`Solo hay ${formatearNumero(linea.stockDisponible)} disponibles.`);
      return;
    }
    setCarrito((anterior) =>
      anterior.map((item) =>
        item.clave === clave ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  }

  function quitar(clave) {
    setCarrito((anterior) => anterior.filter((item) => item.clave !== clave));
  }

  function vaciar() {
    setCarrito([]);
    toast.success("Carrito vaciado.");
  }

  function alCobrar() {
    if (!lineas.length) {
      toast.error("Agrega al menos un producto al carrito.");
      return;
    }
    setCarritoMovil(false);
    setCobrando(true);
  }

  function alRegistrarVenta(venta) {
    setCarrito([]);
    setCobrando(false);
    setFactura(venta);
  }

  const contenidoCarrito = (
    <PanelCarrito
      lineas={lineas}
      totales={totales}
      onCambiarCantidad={cambiarCantidad}
      onQuitar={quitar}
      onVaciar={vaciar}
      onCobrar={alCobrar}
      mostrarCerrar={carritoMovil}
      onCerrar={() => setCarritoMovil(false)}
    />
  );

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de venta</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Selecciona productos, cobra y genera la factura al instante.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta variante={Number(tasa) > 0 ? "exito" : "advertencia"}>
            {Number(tasa) > 0 ? `Tasa: ${formatearVes(tasa)}` : "Tasa no disponible"}
          </Etiqueta>
          <Link
            href="/panel/inventario"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
          >
            <Boxes className="h-4 w-4" />
            Inventario
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-3">
          <Tarjeta className="p-3">
            <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
                <Entrada
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar producto, SKU o variante..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Selector
                value={categoria}
                onChange={(evento) => setCategoria(evento.target.value)}
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((registro) => (
                  <option key={registro} value={registro}>
                    {registro}
                  </option>
                ))}
              </Selector>
            </div>
          </Tarjeta>

          {activos.length === 0 ? (
            <Tarjeta>
              <EstadoVacio
                icono={PackageOpen}
                titulo="No hay productos para vender"
                descripcion="Registra productos en el inventario para empezar a cobrar."
                accion={
                  <Link
                    href="/panel/inventario"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primario)] px-4 py-2.5 text-xs font-semibold text-white"
                  >
                    <Boxes className="h-4 w-4" />
                    Ir al inventario
                  </Link>
                }
              />
            </Tarjeta>
          ) : filtrados.length === 0 ? (
            <Tarjeta>
              <EstadoVacio
                icono={Search}
                titulo="Sin resultados"
                descripcion="Prueba con otro nombre o SKU."
              />
            </Tarjeta>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filtrados.map((producto) => {
                const stock = Number(producto.stock) || 0;
                const agotado = stock <= 0;
                const bajoStock = stock <= Number(producto.stockMinimo || 0);
                const variantes = producto.variantes?.length || 0;
                const precio = precioUnitarioVariante(producto);
                return (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => alTocarProducto(producto)}
                    disabled={agotado}
                    className={[
                      "group flex flex-col rounded-2xl border bg-[var(--superficie)] p-3 text-left transition",
                      "hover:-translate-y-0.5 hover:border-[var(--primario)]/50 hover:shadow-md",
                      "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                      bajoStock && !agotado
                        ? "border-[var(--advertencia)]/40"
                        : "border-[var(--borde)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-bold leading-snug">
                          {producto.nombre}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--texto-tenue)]">
                          {producto.sku}
                        </p>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primario-suave)] text-[var(--primario-fuerte)] transition group-hover:bg-[var(--primario)] group-hover:text-white">
                        <ShoppingCart className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      <Etiqueta variante={agotado ? "peligro" : bajoStock ? "advertencia" : "neutra"}>
                        {agotado
                          ? "Agotado"
                          : `${formatearNumero(stock)} ${producto.tipoEmpaque === "bulto" ? "bultos" : "uds."}`}
                      </Etiqueta>
                      {variantes ? (
                        <Etiqueta variante="info">{variantes} var.</Etiqueta>
                      ) : null}
                      {producto.ofertaActiva ? (
                        <Etiqueta variante="advertencia">
                          <Tag className="h-3 w-3" />
                          -{formatearPorcentaje(producto.ofertaDescuento)}
                        </Etiqueta>
                      ) : null}
                    </div>

                    <div className="mt-auto pt-2.5">
                      <p className="text-base font-bold tracking-tight">
                        {formatearVes(precio.ves)}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] text-[var(--texto-tenue)]">
                          {formatearUsd(precio.usd)}
                        </p>
                        <span className="text-[9px] uppercase tracking-wide text-[var(--texto-tenue)]">
                          {etiquetaEmpaque(producto)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <Tarjeta className="sticky top-4 flex h-[calc(100vh-6.5rem)] flex-col overflow-hidden p-0">
            {contenidoCarrito}
          </Tarjeta>
        </aside>
      </div>

      {lineas.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--borde)] bg-[var(--superficie)]/95 px-3 py-2.5 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setCarritoMovil(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--primario)] px-4 py-3 text-white shadow-lg"
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              <ShoppingCart className="h-4 w-4" />
              {formatearNumero(unidades)} artículo{unidades === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-bold">{formatearVes(totales.totalVes)}</span>
          </button>
        </div>
      ) : null}

      <Modal
        abierto={carritoMovil}
        onCerrar={() => setCarritoMovil(false)}
        titulo="Tu carrito"
        descripcion={`${formatearNumero(unidades)} artículo${unidades === 1 ? "" : "s"} · ${formatearVes(totales.totalVes)}`}
        ancho="md"
        claseContenido="flex max-h-[88vh] flex-col overflow-hidden"
      >
        <div className="-mx-5 -my-5 flex min-h-0 flex-1 flex-col">{contenidoCarrito}</div>
      </Modal>

      <Modal
        abierto={Boolean(productoVariante)}
        onCerrar={() => setProductoVariante(null)}
        titulo="Selecciona una variante"
        descripcion={productoVariante?.nombre}
        ancho="md"
        pie={
          <Boton variante="secundario" onClick={() => setProductoVariante(null)}>
            Cancelar
          </Boton>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {(productoVariante?.variantes || []).map((variante) => {
            const stock = Number(variante.stock) || 0;
            const precios = precioUnitarioVariante(productoVariante, variante);
            return (
              <button
                key={variante.id}
                type="button"
                disabled={stock <= 0}
                onClick={() => agregar(productoVariante, variante)}
                className="rounded-xl border border-[var(--borde)] p-3 text-left transition hover:border-[var(--primario)]/50 hover:bg-[var(--superficie-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold">{variante.nombre}</p>
                  {stock <= 0 ? (
                    <Etiqueta variante="peligro">Agotado</Etiqueta>
                  ) : (
                    <Etiqueta variante="neutra">{formatearNumero(stock)} disp.</Etiqueta>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] text-[var(--texto-tenue)]">
                  {variante.sku}
                </p>
                <p className="mt-1.5 text-sm font-bold">{formatearVes(precios.ves)}</p>
                <p className="text-[10px] text-[var(--texto-tenue)]">
                  {formatearUsd(precios.usd)}
                </p>
              </button>
            );
          })}
        </div>
        {(productoVariante?.variantes || []).length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[var(--texto-suave)]">
            <AlertTriangle className="h-4 w-4 text-[var(--advertencia)]" />
            Este producto no tiene variantes con stock.
          </div>
        ) : null}
      </Modal>

      <ModalCobro
        abierto={cobrando}
        items={lineas.map((linea) => ({
          productoId: linea.productoId,
          varianteId: linea.varianteId,
          cantidad: linea.cantidad,
        }))}
        totales={totales}
        tasa={tasa}
        aplicarIva={aplicarIva}
        porcentajeIva={PORCENTAJE_IVA}
        onCambiarIva={setAplicarIva}
        onCerrar={() => setCobrando(false)}
        onVenta={alRegistrarVenta}
      />

      <ModalFactura
        abierto={Boolean(factura)}
        venta={factura}
        perfil={perfil}
        onCerrar={() => setFactura(null)}
      />
    </div>
  );
}
