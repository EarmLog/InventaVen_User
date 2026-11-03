"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { resumirFacturacion } from "@/lib/utilidades/fiscalidad";
import Tarjeta from "@/components/ui/Tarjeta";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Fiscalidad() {
  const ventas = useLiveQuery(() => (db ? db.ventas.toArray() : []), [], []) || [];
  const facturas = useLiveQuery(
    () => (db ? db.facturasFiscales.orderBy("fecha").reverse().toArray() : []),
    [],
    []
  ) || [];

  const resumen = useMemo(() => resumirFacturacion(ventas), [ventas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Facturación y fiscalidad</h1>
            <Etiqueta variante="info">
              <FileText className="h-3 w-3" />
              {facturas.length} documentos
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Resumen fiscal local de ventas, comprobantes y resultados imponibles.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Comprobantes
          </p>
          <p className="mt-1 text-2xl font-bold">{resumen.totalComprobantes}</p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Base imponible
          </p>
          <p className="mt-1 text-xl font-bold">
            {resumen.baseImponibleUsd.toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            {resumen.baseImponibleVes.toLocaleString("es-VE", { maximumFractionDigits: 2})} VES
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            IVA
          </p>
          <p className="mt-1 text-xl font-bold">
            {resumen.ivaUsd.toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            {resumen.ivaVes.toLocaleString("es-VE", { maximumFractionDigits: 2})} VES
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Total
          </p>
          <p className="mt-1 text-xl font-bold">
            {resumen.totalUsd.toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            {resumen.totalVes.toLocaleString("es-VE", { maximumFractionDigits: 2})} VES
          </p>
        </Tarjeta>
      </div>

      {facturas.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo="Sin comprobantes fiscales"
          descripcion="Aún no se registran comprobantes fiscales en este dispositivo."
        />
      ) : (
        <Tarjeta className="p-4">
          <div className="space-y-2">
            {facturas.slice(0, 12).map((factura) => (
              <div
                key={factura.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borde)] pb-2 text-[11px] last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold">{factura.numeroFactura || "Sin correlativo"}</p>
                  <p className="text-[10px] text-[var(--texto-suave)]">{factura.fecha}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="uppercase text-[10px] font-semibold text-[var(--texto-suave)]">
                    {factura.tipo || "venta"}
                  </span>
                  <span className="font-semibold">
                    {Number(factura.totalUsd || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
