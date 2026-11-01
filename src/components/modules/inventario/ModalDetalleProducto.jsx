"use client";

import { Boxes, Pencil, PackagePlus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Etiqueta from "@/components/ui/Etiqueta";
import {
  calcularGanancia,
  etiquetaEmpaque,
  precioUnitarioVariante,
} from "@/lib/utilidades/precios";
import {
  formatearFechaHora,
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
} from "@/lib/utilidades/formato";

export default function ModalDetalleProducto({
  abierto,
  producto,
  onCerrar,
  onEditar,
  onRenovar,
}) {
  if (!producto) return null;
  const ganancia = calcularGanancia(
    producto.precioCompraUsd,
    producto.precioVentaUsd,
    producto.tasaUsd
  );

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={producto.nombre}
      descripcion={`${producto.sku} · ${producto.categoria} · ${etiquetaEmpaque(producto)}`}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cerrar
          </Boton>
          <Boton variante="secundario" onClick={() => onRenovar?.(producto)}>
            <PackagePlus className="h-4 w-4" />
            Renovar
          </Boton>
          <Boton onClick={() => onEditar?.(producto)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta variante={producto.activo === false ? "peligro" : "exito"}>
            {producto.activo === false ? "Inactivo" : "Activo"}
          </Etiqueta>
          {producto.ofertaActiva ? (
            <Etiqueta variante="advertencia">
              Oferta: desde {producto.ofertaCantidad} · {producto.ofertaDescuento}%
            </Etiqueta>
          ) : null}
          {producto.variantes?.length ? (
            <Etiqueta variante="info">
              {producto.variantes.length} variante
              {producto.variantes.length === 1 ? "" : "s"}
            </Etiqueta>
          ) : null}
          <Etiqueta variante="neutra">{etiquetaEmpaque(producto)}</Etiqueta>
        </div>

        {producto.descripcion ? (
          <p className="rounded-xl bg-[var(--superficie-2)] px-3 py-2 text-xs leading-relaxed text-[var(--texto-suave)]">
            {producto.descripcion}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--borde)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Stock actual
            </p>
            <p className="mt-1 text-lg font-bold">{formatearNumero(producto.stock)}</p>
            <p className="text-[10px] text-[var(--texto-tenue)]">
              mínimo {formatearNumero(producto.stockMinimo)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--borde)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Compra
            </p>
            <p className="mt-1 text-sm font-bold">{formatearVes(producto.precioCompraVes)}</p>
            <p className="text-[10px] text-[var(--texto-tenue)]">
              {formatearUsd(producto.precioCompraUsd)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--borde)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Venta
            </p>
            <p className="mt-1 text-sm font-bold">{formatearVes(producto.precioVentaVes)}</p>
            <p className="text-[10px] text-[var(--texto-tenue)]">
              {formatearUsd(producto.precioVentaUsd)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--borde)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
              Ganancia
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--primario-fuerte)]">
              {formatearVes(ganancia.gananciaVes)}
            </p>
            <p className="text-[10px] text-[var(--texto-tenue)]">
              {formatearUsd(ganancia.gananciaUsd)} · {formatearPorcentaje(ganancia.margenPorcentaje)} margen
            </p>
          </div>
        </div>

        {producto.variantes?.length ? (
          <div className="overflow-hidden rounded-xl border border-[var(--borde)]">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Variante</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Precio venta</th>
                </tr>
              </thead>
              <tbody>
                {producto.variantes.map((variante) => {
                  const precios = precioUnitarioVariante(producto, variante);
                  return (
                    <tr key={variante.id}>
                      <td className="text-xs font-semibold">{variante.nombre}</td>
                      <td className="font-mono text-[10px] text-[var(--texto-suave)]">
                        {variante.sku}
                      </td>
                      <td className="text-xs">{formatearNumero(variante.stock)}</td>
                      <td className="text-xs">
                        {formatearVes(precios.ves)}
                        <span className="block text-[10px] text-[var(--texto-tenue)]">
                          {formatearUsd(precios.usd)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--superficie-2)] px-3 py-2 text-[11px]">
            <p className="text-[var(--texto-suave)]">Registrado</p>
            <p className="font-semibold">{formatearFechaHora(producto.creadoEn)}</p>
          </div>
          <div className="rounded-xl bg-[var(--superficie-2)] px-3 py-2 text-[11px]">
            <p className="text-[var(--texto-suave)]">Última renovación / edición</p>
            <p className="font-semibold">
              {formatearFechaHora(producto.fechaRenovacion || producto.actualizadoEn)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[var(--texto-tenue)]">
          <Boxes className="h-4 w-4" />
          Tasa con la que se registró: {producto.tasaUsd ? formatearVes(producto.tasaUsd) : "—"}
        </div>
      </div>
    </Modal>
  );
}
