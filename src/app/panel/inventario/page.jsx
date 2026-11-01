"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Eye,
  PackageOpen,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { useTasa } from "@/context/TasaContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import ModalProducto from "@/components/modules/inventario/ModalProducto";
import ModalRenovar from "@/components/modules/inventario/ModalRenovar";
import ModalEliminar from "@/components/modules/inventario/ModalEliminar";
import ModalDetalleProducto from "@/components/modules/inventario/ModalDetalleProducto";
import { calcularGanancia, etiquetaEmpaque } from "@/lib/utilidades/precios";
import {
  formatearFecha,
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  redondear,
} from "@/lib/utilidades/formato";

function Miniatura({ Icono, etiqueta, valor, detalle, tono = "verde" }) {
  const tonos = {
    verde: "bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
    azul: "bg-[var(--info-suave)] text-[var(--info)]",
    ambar: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
    violeta: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  };
  return (
    <Tarjeta className="flex items-center gap-3 p-4">
      <span className={["flex h-10 w-10 items-center justify-center rounded-xl", tonos[tono]].join(" ")}>
        <Icono className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
          {etiqueta}
        </p>
        <p className="truncate text-lg font-bold tracking-tight">{valor}</p>
        <p className="truncate text-[10px] text-[var(--texto-tenue)]">{detalle}</p>
      </div>
    </Tarjeta>
  );
}

export default function PaginaInventario() {
  const { tasa } = useTasa();
  const productos =
    useLiveQuery(() => (db ? db.productos.orderBy("creadoEn").reverse().toArray() : []), [], []) ||
    [];
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [filtro, setFiltro] = useState("todos");
  const [modalProducto, setModalProducto] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [productoRenovar, setProductoRenovar] = useState(null);
  const [productoEliminar, setProductoEliminar] = useState(null);
  const [productoDetalle, setProductoDetalle] = useState(null);

  const categorias = useMemo(
    () => [...new Set(productos.map((producto) => producto.categoria).filter(Boolean))].sort(),
    [productos]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return productos.filter((producto) => {
      const coincideBusqueda =
        !termino ||
        producto.nombre.toLowerCase().includes(termino) ||
        producto.sku.toLowerCase().includes(termino) ||
        producto.categoria?.toLowerCase().includes(termino) ||
        (producto.variantes || []).some(
          (variante) =>
            variante.nombre.toLowerCase().includes(termino) ||
            variante.sku.toLowerCase().includes(termino)
        );
      const coincideCategoria = categoria === "todas" || producto.categoria === categoria;
      let coincideFiltro = true;
      if (filtro === "bajo") {
        coincideFiltro = Number(producto.stock) <= Number(producto.stockMinimo || 0);
      } else if (filtro === "agotado") {
        coincideFiltro = Number(producto.stock) <= 0;
      } else if (filtro === "oferta") {
        coincideFiltro = Boolean(producto.ofertaActiva);
      } else if (filtro === "inactivos") {
        coincideFiltro = producto.activo === false;
      }
      return coincideBusqueda && coincideCategoria && coincideFiltro;
    });
  }, [productos, busqueda, categoria, filtro]);

  const valorInventarioVes = redondear(
    productos.reduce(
      (total, producto) =>
        total + Number(producto.stock || 0) * Number(producto.precioCompraVes || 0),
      0
    )
  );
  const valorInventarioUsd = redondear(
    productos.reduce(
      (total, producto) =>
        total + Number(producto.stock || 0) * Number(producto.precioCompraUsd || 0),
      0
    )
  );
  const stockBajo = productos.filter(
    (producto) => Number(producto.stock) <= Number(producto.stockMinimo || 0)
  ).length;
  const ofertas = productos.filter((producto) => producto.ofertaActiva).length;
  const variantes = productos.reduce(
    (total, producto) => total + (producto.variantes?.length || 0),
    0
  );

  function abrirNuevo() {
    setProductoEditar(null);
    setModalProducto(true);
  }

  function abrirEditar(producto) {
    setProductoDetalle(null);
    setProductoEditar(producto);
    setModalProducto(true);
  }

  function abrirRenovar(producto) {
    setProductoDetalle(null);
    setProductoRenovar(producto);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Productos, variantes, bultos, ofertas y stock en un solo lugar.
          </p>
        </div>
        <Boton onClick={abrirNuevo}>
          <Plus className="h-4 w-4" />
          Registrar producto
        </Boton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Miniatura
          Icono={Boxes}
          etiqueta="Productos"
          valor={formatearNumero(productos.length)}
          detalle={`${variantes} variantes registradas`}
        />
        <Miniatura
          Icono={DollarSign}
          etiqueta="Valor de inventario"
          valor={formatearVes(valorInventarioVes)}
          detalle={formatearUsd(valorInventarioUsd)}
          tono="azul"
        />
        <Miniatura
          Icono={AlertTriangle}
          etiqueta="Stock bajo / agotado"
          valor={formatearNumero(stockBajo)}
          detalle="Según el stock mínimo configurado"
          tono={stockBajo ? "ambar" : "verde"}
        />
        <Miniatura
          Icono={Tag}
          etiqueta="Con oferta"
          valor={formatearNumero(ofertas)}
          detalle="Descuentos automáticos en el POS"
          tono="violeta"
        />
      </div>

      <Tarjeta className="p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
            <Entrada
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre, SKU, categoría o variante..."
              className="pl-9"
            />
          </div>
          <Selector value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>
            <option value="todas">Todas las categorías</option>
            {categorias.map((registro) => (
              <option key={registro} value={registro}>
                {registro}
              </option>
            ))}
          </Selector>
          <Selector value={filtro} onChange={(evento) => setFiltro(evento.target.value)}>
            <option value="todos">Todo el stock</option>
            <option value="bajo">Stock bajo</option>
            <option value="agotado">Agotados</option>
            <option value="oferta">Con oferta</option>
            <option value="inactivos">Inactivos</option>
          </Selector>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[var(--borde)] pt-3">
          <p className="text-[11px] text-[var(--texto-suave)]">
            {filtrados.length} de {productos.length} producto
            {productos.length === 1 ? "" : "s"}
          </p>
          <Boton variante="fantasma" tamano="sm" onClick={abrirNuevo}>
            <PackagePlus className="h-3.5 w-3.5" />
            Nuevo
          </Boton>
        </div>
      </Tarjeta>

      {productos.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            icono={PackageOpen}
            titulo="Tu inventario está vacío"
            descripcion="Registra tu primer producto o bulto para empezar a vender y controlar tu stock."
            accion={
              <Boton onClick={abrirNuevo}>
                <Plus className="h-4 w-4" />
                Registrar primer producto
              </Boton>
            }
          />
        </Tarjeta>
      ) : filtrados.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            icono={Search}
            titulo="No encontramos productos"
            descripcion="Prueba con otro nombre, SKU o cambia los filtros de búsqueda."
          />
        </Tarjeta>
      ) : (
        <>
          <Tarjeta className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="tabla-base min-w-[1050px]">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock</th>
                    <th>Compra</th>
                    <th>Venta</th>
                    <th>Ganancia</th>
                    <th>Oferta</th>
                    <th>Renovado / editado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((producto) => {
                    const ganancia = calcularGanancia(
                      producto.precioCompraUsd,
                      producto.precioVentaUsd,
                      producto.tasaUsd
                    );
                    const bajoStock =
                      Number(producto.stock) <= Number(producto.stockMinimo || 0);
                    return (
                      <tr key={producto.id}>
                        <td>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
                              <Boxes className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="max-w-[260px] truncate text-xs font-semibold">
                                  {producto.nombre}
                                </p>
                                {producto.activo === false ? (
                                  <Etiqueta variante="peligro">Inactivo</Etiqueta>
                                ) : null}
                              </div>
                              <p className="font-mono text-[10px] text-[var(--texto-suave)]">
                                {producto.sku}
                              </p>
                              <p className="text-[10px] text-[var(--texto-tenue)]">
                                {producto.categoria} · {etiquetaEmpaque(producto)}
                                {producto.variantes?.length
                                  ? ` · ${producto.variantes.length} variantes`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className={["text-xs font-bold", bajoStock ? "text-[var(--peligro)]" : ""].join(" ")}>
                            {formatearNumero(producto.stock)}{" "}
                            {producto.tipoEmpaque === "bulto" ? "bultos" : "uds."}
                          </p>
                          <p className="text-[10px] text-[var(--texto-tenue)]">
                            mín. {formatearNumero(producto.stockMinimo)}
                          </p>
                        </td>
                        <td>
                          <p className="text-xs font-semibold">
                            {formatearVes(producto.precioCompraVes)}
                          </p>
                          <p className="text-[10px] text-[var(--texto-tenue)]">
                            {formatearUsd(producto.precioCompraUsd)}
                          </p>
                        </td>
                        <td>
                          <p className="text-xs font-semibold">
                            {formatearVes(producto.precioVentaVes)}
                          </p>
                          <p className="text-[10px] text-[var(--texto-tenue)]">
                            {formatearUsd(producto.precioVentaUsd)}
                          </p>
                        </td>
                        <td>
                          <p
                            className={[
                              "text-xs font-bold",
                              ganancia.gananciaUsd >= 0
                                ? "text-[var(--primario-fuerte)]"
                                : "text-[var(--peligro)]",
                            ].join(" ")}
                          >
                            {formatearVes(ganancia.gananciaVes)}
                          </p>
                          <p className="text-[10px] text-[var(--texto-tenue)]">
                            {formatearPorcentaje(ganancia.margenPorcentaje)}
                          </p>
                        </td>
                        <td>
                          {producto.ofertaActiva ? (
                            <Etiqueta variante="advertencia">
                              -{formatearPorcentaje(producto.ofertaDescuento)} desde{" "}
                              {formatearNumero(producto.ofertaCantidad)}
                            </Etiqueta>
                          ) : (
                            <span className="text-[10px] text-[var(--texto-tenue)]">Sin oferta</span>
                          )}
                        </td>
                        <td>
                          <p className="text-[10px] text-[var(--texto-suave)]">
                            {formatearFecha(producto.fechaRenovacion || producto.actualizadoEn)}
                          </p>
                          <p className="text-[10px] text-[var(--texto-tenue)]">
                            alta {formatearFecha(producto.creadoEn)}
                          </p>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Boton
                              variante="fantasma"
                              tamano="icono"
                              title="Ver detalle"
                              onClick={() => setProductoDetalle(producto)}
                            >
                              <Eye className="h-4 w-4" />
                            </Boton>
                            <Boton
                              variante="fantasma"
                              tamano="icono"
                              title="Renovar stock"
                              onClick={() => abrirRenovar(producto)}
                            >
                              <RefreshCw className="h-4 w-4 text-[var(--primario)]" />
                            </Boton>
                            <Boton
                              variante="fantasma"
                              tamano="icono"
                              title="Editar producto"
                              onClick={() => abrirEditar(producto)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Boton>
                            <Boton
                              variante="fantasma"
                              tamano="icono"
                              title="Eliminar producto"
                              onClick={() => setProductoEliminar(producto)}
                            >
                              <Trash2 className="h-4 w-4 text-[var(--peligro)]" />
                            </Boton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <div className="space-y-2 md:hidden">
            {filtrados.map((producto) => {
              const ganancia = calcularGanancia(
                producto.precioCompraUsd,
                producto.precioVentaUsd,
                producto.tasaUsd
              );
              const bajoStock =
                Number(producto.stock) <= Number(producto.stockMinimo || 0);
              return (
                <Tarjeta key={producto.id} className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{producto.nombre}</p>
                      <p className="font-mono text-[10px] text-[var(--texto-suave)]">
                        {producto.sku}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Boton
                        variante="fantasma"
                        tamano="icono"
                        onClick={() => setProductoDetalle(producto)}
                        title="Ver"
                      >
                        <Eye className="h-4 w-4" />
                      </Boton>
                      <Boton
                        variante="fantasma"
                        tamano="icono"
                        onClick={() => abrirEditar(producto)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Boton>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Etiqueta variante={bajoStock ? "peligro" : "neutra"}>
                      {formatearNumero(producto.stock)}{" "}
                      {producto.tipoEmpaque === "bulto" ? "bultos" : "uds."}
                    </Etiqueta>
                    <Etiqueta variante="info">{etiquetaEmpaque(producto)}</Etiqueta>
                    {producto.ofertaActiva ? (
                      <Etiqueta variante="advertencia">
                        -{formatearPorcentaje(producto.ofertaDescuento)} desde{" "}
                        {formatearNumero(producto.ofertaCantidad)}
                      </Etiqueta>
                    ) : null}
                    {producto.variantes?.length ? (
                      <Etiqueta variante="neutra">{producto.variantes.length} variantes</Etiqueta>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-[var(--superficie-2)] py-1.5">
                      <p className="text-[9px] uppercase text-[var(--texto-tenue)]">Compra</p>
                      <p className="text-[11px] font-semibold">{formatearVes(producto.precioCompraVes)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--superficie-2)] py-1.5">
                      <p className="text-[9px] uppercase text-[var(--texto-tenue)]">Venta</p>
                      <p className="text-[11px] font-semibold">{formatearVes(producto.precioVentaVes)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--primario-suave)] py-1.5">
                      <p className="text-[9px] uppercase text-[var(--primario-fuerte)]/70">Ganancia</p>
                      <p className="text-[11px] font-semibold text-[var(--primario-fuerte)]">
                        {formatearVes(ganancia.gananciaVes)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] text-[var(--texto-tenue)]">
                      Ref. {formatearUsd(producto.precioVentaUsd)}
                    </p>
                    <div className="flex gap-1">
                      <Boton
                        variante="exitoSuave"
                        tamano="sm"
                        onClick={() => abrirRenovar(producto)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Renovar
                      </Boton>
                      <Boton
                        variante="peligroSuave"
                        tamano="icono"
                        onClick={() => setProductoEliminar(producto)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Boton>
                    </div>
                  </div>
                </Tarjeta>
              );
            })}
          </div>
        </>
      )}

      <ModalProducto
        abierto={modalProducto}
        producto={productoEditar}
        tasa={tasa}
        onCerrar={() => {
          setModalProducto(false);
          setProductoEditar(null);
        }}
      />
      <ModalRenovar
        abierto={Boolean(productoRenovar)}
        producto={productoRenovar}
        tasa={tasa}
        onCerrar={() => setProductoRenovar(null)}
      />
      <ModalEliminar
        abierto={Boolean(productoEliminar)}
        producto={productoEliminar}
        onCerrar={() => setProductoEliminar(null)}
      />
      <ModalDetalleProducto
        abierto={Boolean(productoDetalle)}
        producto={productoDetalle}
        onCerrar={() => setProductoDetalle(null)}
        onEditar={abrirEditar}
        onRenovar={abrirRenovar}
      />
    </div>
  );
}
