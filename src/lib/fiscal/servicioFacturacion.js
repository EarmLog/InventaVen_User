import { db } from "@/lib/db/baseDatos";
import {
  guardarFacturaFiscal,
  listarFacturasFiscales,
  guardarCompraFiscal,
  listarComprasFiscales,
} from "@/lib/db/repositorios";
import {
  construirComprobanteFiscal,
  resumirFacturacion,
  resumirCompras,
} from "@/lib/utilidades/fiscalidad";
import { generarId } from "@/lib/utilidades/formato";

export const NIVELES_FISCAL = ["A", "B"];

export async function emitirComprobanteFiscal({
  venta,
  tipo = "venta",
  nivel = "A",
  datosMaquina = null,
  perfil = {},
}) {
  const comprobante = construirComprobanteFiscal(venta, tipo);
  const ahora = new Date().toISOString();
  const prefijo = nivel === "B" ? "CTL" : "FAC";
  const numeroControl = `${prefijo}-${String(generarId()).slice(0, 8)}`;
  const factura = {
    ...comprobante,
    numeroControl,
    nivel,
    estado: nivel === "B" ? "enviada" : comprobante.estado,
    registroMaquina: datosMaquina?.registro || null,
    negocioRif: String(perfil?.rif || ""),
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  const id = await guardarFacturaFiscal(factura);
  return { ...factura, id };
}

export async function listarComprobantesFiscales() {
  return listarFacturasFiscales();
}

export async function registrarCompraFiscal({ compra }) {
  const factura = await guardarCompraFiscal(compra);
  return { ...compra, id: factura };
}

export async function listarComprobantesCompras() {
  const compras = await listarComprasFiscales();
  return compras;
}

export async function generarLibroVentas({ fecha } = {}) {
  const ventas = await db.ventas.where("estado").equals("completada").toArray();
  const delDia = fecha ? String(fecha).slice(0, 10) : null;
  const delDiaVentas = delDia
    ? ventas.filter((venta) => String(venta.fecha || "").slice(0, 10) === delDia)
    : ventas;
  const resumen = resumirFacturacion(delDiaVentas);
  return { fecha: fecha || null, tipo: "ventas", ...resumen };
}

export async function generarLibroCompras({ fecha } = {}) {
  const compras = await db.compras.orderBy("fecha").reverse().toArray();
  const delDia = fecha ? String(fecha).slice(0, 10) : null;
  const delDiaCompras = delDia
    ? compras.filter((compra) => String(compra.fecha || "").slice(0, 10) === delDia)
    : compras;
  const resumen = resumirCompras(delDiaCompras);
  return { fecha: fecha || null, tipo: "compras", ...resumen };
}

export async function generarReporteCierreCaja({ fecha } = {}) {
  const ventas = await db.ventas.where("estado").equals("completada").toArray();
  const delDia = fecha
    ? String(fecha).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const delDiaVentas = ventas.filter((venta) => {
    const fechaVenta = String(venta.fecha || "").slice(0, 10);
    return fechaVenta === delDia;
  });
  const resumen = resumirFacturacion(delDiaVentas);
  return {
    fecha: delDia,
    totalComprobantes: resumen.totalComprobantes,
    baseImponibleUsd: resumen.baseImponibleUsd,
    ivaUsd: resumen.ivaUsd,
    igtfUsd: resumen.igtfUsd,
    totalUsd: resumen.totalUsd,
    baseImponibleVes: resumen.baseImponibleVes,
    ivaVes: resumen.ivaVes,
    igtfVes: resumen.igtfVes,
    totalVes: resumen.totalVes,
    retencionesUsd: resumen.retencionesUsd,
    retencionesVes: resumen.retencionesVes,
  };
}

export async function generarReporteParcialCierreCaja({ fecha } = {}) {
  const ventas = await db.ventas.where("estado").equals("completada").toArray();
  const inicio = fecha ? new Date(`${String(fecha).slice(0, 10)}T00:00:00`) : new Date();
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  const parciales = ventas.filter((venta) => {
    const fechaVenta = new Date(venta.fecha);
    return fechaVenta >= inicio && fechaVenta < fin;
  });
  const resumen = resumirFacturacion(parciales);
  return {
    desde: inicio.toISOString(),
    hasta: fin.toISOString(),
    totalComprobantes: resumen.totalComprobantes,
    totalUsd: resumen.totalUsd,
    ivaUsd: resumen.ivaUsd,
    igtfUsd: resumen.igtfUsd,
    totalVes: resumen.totalVes,
    retencionesUsd: resumen.retencionesUsd,
  };
}
