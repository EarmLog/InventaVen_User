"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Download, Filter, Calendar } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { resumirFacturacion } from "@/lib/utilidades/fiscalidad";
import { exportarExcelReporte, exportarPdfReporte } from "@/lib/utilidades/exportar";
import { toast } from "sonner";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Entrada from "@/components/ui/Entrada";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Fiscalidad() {
  const ventas = useLiveQuery(() => (db ? db.ventas.toArray() : []), [], []) || [];
  const facturas = useLiveQuery(
    () => (db ? db.facturasFiscales.orderBy("fecha").reverse().toArray() : []),
    [],
    []
  ) || [];

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (!v.fecha) return true;
      const fechaVenta = v.fecha.slice(0, 10);
      if (fechaInicio && fechaVenta < fechaInicio) return false;
      if (fechaFin && fechaVenta > fechaFin) return false;
      return true;
    });
  }, [ventas, fechaInicio, fechaFin]);

  const facturasFiltradas = useMemo(() => {
    return facturas.filter((f) => {
      if (!f.fecha) return true;
      const fechaFac = f.fecha.slice(0, 10);
      if (fechaInicio && fechaFac < fechaInicio) return false;
      if (fechaFin && fechaFac > fechaFin) return false;
      return true;
    });
  }, [facturas, fechaInicio, fechaFin]);

  const resumen = useMemo(() => resumirFacturacion(ventasFiltradas), [ventasFiltradas]);

  const exportarExcelSeniat = () => {
    try {
      const datosExportar = facturasFiltradas.length > 0
        ? facturasFiltradas.map((f) => ({
            "Nro Factura": f.numeroFactura || "S/N",
            "Fecha": f.fecha || "",
            "Tipo": f.tipo || "venta",
            "Base Imponible (USD)": f.baseImponibleUsd || 0,
            "IVA (USD)": f.ivaUsd || 0,
            "Total (USD)": f.totalUsd || 0,
            "Base Imponible (VES)": f.baseImponibleVes || 0,
            "IVA (VES)": f.ivaVes || 0,
            "Total (VES)": f.totalVes || 0,
          }))
        : ventasFiltradas.map((v) => ({
            "Nro Venta": v.codigo || v.id,
            "Fecha": v.fecha || "",
            "Base Imponible (USD)": v.baseUsd || 0,
            "IVA (USD)": v.ivaUsd || 0,
            "Total (USD)": v.totalUsd || 0,
            "Base Imponible (VES)": v.baseVes || 0,
            "IVA (VES)": v.ivaVes || 0,
            "Total (VES)": v.totalVes || 0,
          }));

      if (datosExportar.length === 0) {
        toast.error("No hay datos para exportar en el rango seleccionado.");
        return;
      }

      exportarExcelReporte(
        datosExportar,
        "Declaracion_Fiscal",
        `Declaracion_Fiscal_${fechaInicio || "inicio"}_al_${fechaFin || "hoy"}.xlsx`
      );
      toast.success("Reporte Excel para declaración generado exitosamente.");
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar Excel.");
    }
  };

  const exportarPdfSeniat = () => {
    try {
      const filas = facturasFiltradas.length > 0
        ? facturasFiltradas.map((f) => [
            f.numeroFactura || "S/N",
            f.fecha ? f.fecha.slice(0, 10) : "",
            f.tipo || "venta",
            `${Number(f.baseImponibleUsd || 0).toFixed(2)} USD`,
            `${Number(f.ivaUsd || 0).toFixed(2)} USD`,
            `${Number(f.totalUsd || 0).toFixed(2)} USD`,
          ])
        : ventasFiltradas.map((v) => [
            v.codigo || v.id.slice(0, 8),
            v.fecha ? v.fecha.slice(0, 10) : "",
            "venta",
            `${Number(v.baseUsd || 0).toFixed(2)} USD`,
            `${Number(v.ivaUsd || 0).toFixed(2)} USD`,
            `${Number(v.totalUsd || 0).toFixed(2)} USD`,
          ]);

      if (filas.length === 0) {
        toast.error("No hay datos para exportar en el rango seleccionado.");
        return;
      }

      exportarPdfReporte({
        titulo: `Declaración Fiscal y Tributaria (${fechaInicio || "Inicio"} al ${fechaFin || "Hoy"})`,
        columnas: ["Nro / Comprobante", "Fecha", "Tipo", "Base Imp.", "IVA (16%)", "Total"],
        filas,
        nombreArchivo: `Declaracion_Fiscal_${fechaInicio || "inicio"}_al_${fechaFin || "hoy"}.pdf`,
      });
      toast.success("Reporte PDF para declaración generado exitosamente.");
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar PDF.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtro de fechas y botones de exportación */}
      <Tarjeta className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--texto-suave)] block mb-1">Desde</label>
              <Entrada
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--texto-suave)] block mb-1">Hasta</label>
              <Entrada
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            {(fechaInicio || fechaFin) && (
              <Boton
                variante="secundario"
                onClick={() => {
                  setFechaInicio("");
                  setFechaFin("");
                }}
              >
                Limpiar filtro
              </Boton>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Boton variante="secundario" onClick={exportarExcelSeniat} className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel (Tributario)
            </Boton>
            <Boton variante="primario" onClick={exportarPdfSeniat} className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Exportar PDF (Tributario)
            </Boton>
          </div>
        </div>
      </Tarjeta>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Comprobantes / Ventas
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
            {resumen.baseImponibleVes.toLocaleString("es-VE", { maximumFractionDigits: 2 })} VES
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            IVA (16%)
          </p>
          <p className="mt-1 text-xl font-bold">
            {resumen.ivaUsd.toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            {resumen.ivaVes.toLocaleString("es-VE", { maximumFractionDigits: 2 })} VES
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Total imponible
          </p>
          <p className="mt-1 text-xl font-bold">
            {resumen.totalUsd.toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
          </p>
          <p className="text-[10px] text-[var(--texto-tenue)]">
            {resumen.totalVes.toLocaleString("es-VE", { maximumFractionDigits: 2 })} VES
          </p>
        </Tarjeta>
      </div>

      {facturasFiltradas.length === 0 && ventasFiltradas.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo="Sin registros fiscales en este rango"
          descripcion="No se encontraron comprobantes o ventas para las fechas seleccionadas."
        />
      ) : (
        <Tarjeta className="p-4">
          <h3 className="text-sm font-bold mb-3">Detalle de comprobantes en el período</h3>
          <div className="space-y-2">
            {(facturasFiltradas.length > 0 ? facturasFiltradas : ventasFiltradas).slice(0, 30).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borde)] pb-2 text-[11px] last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold">{item.numeroFactura || item.codigo || "Comprobante local"}</p>
                  <p className="text-[10px] text-[var(--texto-suave)]">{item.fecha}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="uppercase text-[10px] font-semibold text-[var(--texto-suave)]">
                    {item.tipo || "venta"}
                  </span>
                  <span className="font-semibold">
                    {Number(item.totalUsd || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 })} USD
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
