"use client";

import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import Boton from "@/components/ui/Boton";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { formatearNumero, formatearPorcentaje, formatearUsd, formatearVes } from "@/lib/utilidades/formato";

export default function PanelCarrito({
  lineas,
  totales,
  onCambiarCantidad,
  onQuitar,
  onVaciar,
  onCobrar,
  mostrarCerrar = false,
  onCerrar,
}) {
  const cantidadItems = lineas.reduce((total, linea) => total + linea.cantidad, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--borde)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
            <ShoppingCart className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">Carrito</p>
            <p className="text-[10px] text-[var(--texto-suave)]">
              {formatearNumero(cantidadItems)} artículo{cantidadItems === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {lineas.length ? (
            <Boton variante="fantasma" tamano="sm" onClick={onVaciar}>
              Vaciar
            </Boton>
          ) : null}
          {mostrarCerrar ? (
            <Boton variante="fantasma" tamano="icono" onClick={onCerrar} title="Cerrar carrito">
              <X className="h-4 w-4" />
            </Boton>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {lineas.length === 0 ? (
          <EstadoVacio
            icono={ShoppingCart}
            titulo="Aún no hay productos"
            descripcion="Toca un producto del catálogo para agregarlo al carrito."
          />
        ) : (
          <div className="space-y-2">
            {lineas.map((linea) => (
              <div
                key={linea.clave}
                className="rounded-xl border border-[var(--borde)] bg-[var(--superficie)] p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{linea.nombre}</p>
                    <p className="truncate text-[10px] text-[var(--texto-suave)]">
                      {linea.variante ? `${linea.variante} · ` : ""}
                      {linea.sku}
                    </p>
                  </div>
                  <Boton
                    variante="fantasma"
                    tamano="icono"
                    className="h-7 w-7"
                    title="Quitar"
                    onClick={() => onQuitar(linea.clave)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--peligro)]" />
                  </Boton>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-lg border border-[var(--borde)]">
                    <button
                      type="button"
                      className="px-2 py-1.5 text-[var(--texto-suave)] hover:text-[var(--texto)]"
                      onClick={() => onCambiarCantidad(linea.clave, linea.cantidad - 1)}
                      aria-label="Disminuir"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-8 px-1 text-center text-xs font-bold">
                      {formatearNumero(linea.cantidad)}
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1.5 text-[var(--texto-suave)] hover:text-[var(--texto)]"
                      onClick={() => onCambiarCantidad(linea.clave, linea.cantidad + 1)}
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{formatearVes(linea.totalVes)}</p>
                    <p className="text-[10px] text-[var(--texto-tenue)]">
                      {formatearUsd(linea.totalUsd)}
                    </p>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-[var(--texto-tenue)]">
                    {formatearVes(linea.precioVes)} c/u
                  </span>
                  {linea.descuentoPct > 0 ? (
                    <Etiqueta variante="advertencia">
                      Oferta -{formatearPorcentaje(linea.descuentoPct)}
                    </Etiqueta>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--borde)] bg-[var(--superficie-2)] px-4 py-3">
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-[var(--texto-suave)]">
            <span>Subtotal</span>
            <span>{formatearVes(totales.subtotalVes)}</span>
          </div>
          {totales.descuentoVes > 0 ? (
            <div className="flex items-center justify-between text-[var(--advertencia)]">
              <span>Descuentos por oferta</span>
              <span>-{formatearVes(totales.descuentoVes)}</span>
            </div>
          ) : null}
          {totales.ivaVes > 0 ? (
            <div className="flex items-center justify-between text-[var(--texto-suave)]">
              <span>IVA ({totales.porcentajeIva}%)</span>
              <span>{formatearVes(totales.ivaVes)}</span>
            </div>
          ) : null}
          <div className="flex items-end justify-between border-t border-[var(--borde)] pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
              Total
            </span>
            <div className="text-right">
              <p className="text-xl font-bold tracking-tight">{formatearVes(totales.totalVes)}</p>
              <p className="text-[10px] text-[var(--texto-suave)]">
                {formatearUsd(totales.totalUsd)}
              </p>
            </div>
          </div>
        </div>
        <Boton
          className="mt-3 w-full"
          tamano="lg"
          onClick={onCobrar}
          disabled={lineas.length === 0}
        >
          Cobrar {formatearVes(totales.totalVes)}
        </Boton>
      </div>
    </div>
  );
}
