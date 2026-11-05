import { PORCENTAJE_IVA, PORCENTAJE_IGTF } from "./constantes";
import { redondear } from "./formato";

export const TIPOS_COMPROBANTE_FISCAL = [
  { valor: "venta", etiqueta: "Venta" },
  { valor: "nota_credito", etiqueta: "Nota de crédito" },
  { valor: "nota_debito", etiqueta: "Nota de débito" },
  { valor: "retencion", etiqueta: "Retención" },
  { valor: "exencion", etiqueta: "Exención" },
];

export function esComprobanteFiscal(venta) {
  return Boolean(venta) && venta.estado === "completada";
}

export function esPagoEnDivisas(venta) {
  const tipoPago = String(venta?.tipoPago || "").toLowerCase();
  const metodosLocales = [
    "efectivo",
    "tarjeta",
    "biopago",
    "pagomovil",
    "pse",
    "spei",
    "transferencia",
  ];
  if (metodosLocales.includes(tipoPago)) return false;
  if (["usd", "dolar", "dolares", "usd"].includes(tipoPago)) return true;
  return Number(venta?.baseImponibleUsd || 0) > 0;
}

export function calcularIgTf({ baseUsd, baseVes, totalUsd, totalVes, aplicar = true }) {
  const base = aplicar ? Number(baseUsd) || 0 : 0;
  const igtfUsd = redondear((base * (Number(PORCENTAJE_IGTF) / 100)) || 0);
  const igtfVes = redondear((Number(baseVes) || 0) * (Number(PORCENTAJE_IGTF) / 100) || 0);
  const totalConIgtfUsd = redondear((Number(totalUsd) || 0) + igtfUsd);
  const totalConIgtfVes = redondear((Number(totalVes) || 0) + igtfVes);
  return { aplicar, igtfUsd, igtfVes, totalConIgtfUsd, totalConIgtfVes };
}

export function construirComprobanteFiscal(venta, tipo = "venta") {
  const tipoValido =
    TIPOS_COMPROBANTE_FISCAL.some((registro) => registro.valor === tipo) ? tipo : "venta";
  const esExencion = tipoValido === "exencion";
  const esRetencion = tipoValido === "retencion";
  const baseUsd = esExencion || esRetencion ? 0 : Number(venta?.baseUsd) || 0;
  const baseVes = esExencion || esRetencion ? 0 : Number(venta?.baseVes) || 0;
  const ivaUsd = esExencion ? 0 : Number(venta?.ivaUsd) || 0;
  const ivaVes = esExencion ? 0 : Number(venta?.ivaVes) || 0;
  const totalUsd = esExencion || esRetencion ? 0 : Number(venta?.totalUsd) || 0;
  const totalVes = esExencion || esRetencion ? 0 : Number(venta?.totalVes) || 0;

  const igtf = calcularIgTf({
    baseUsd: esRetencion || esExencion ? 0 : baseUsd,
    baseVes: esRetencion || esExencion ? 0 : baseVes,
    totalUsd,
    totalVes,
    aplicar: !esRetencion && !esExencion && esPagoEnDivisas(venta),
  });

  const totalFinalUsd = esRetencion || esExencion ? 0 : igtf.totalConIgtfUsd;
  const totalFinalVes = esRetencion || esExencion ? 0 : igtf.totalConIgtfVes;
  const retencionesUsd = esRetencion ? redondear(Number(venta?.retencionUsd) || 0) : 0;
  const retencionesVes = esRetencion ? redondear(Number(venta?.retencionVes) || 0) : 0;

  return {
    ventaId: venta?.id || null,
    numeroFactura: venta?.numeroFactura || null,
    tipo: tipoValido,
    fecha: venta?.fecha || null,
    baseImponibleUsd: esRetencion || esExencion ? 0 : baseUsd,
    baseImponibleVes: esRetencion || esExencion ? 0 : baseVes,
    ivaUsd: redondear(esExencion ? 0 : ivaUsd),
    ivaVes: redondear(esExencion ? 0 : ivaVes),
    igtfUsd: redondear(igtf.aplicar ? igtf.igtfUsd : 0),
    igtfVes: redondear(igtf.aplicar ? igtf.igtfVes : 0),
    totalUsd: redondear(totalFinalUsd),
    totalVes: redondear(totalFinalVes),
    retencionesUsd,
    retencionesVes,
    totalRetenidoUsd: redondear(retencionesUsd),
    totalRetenidoVes: redondear(retencionesVes),
    estado: "emitido",
    nivel: "A",
    porcentajeIva: esExencion ? 0 : Number(venta?.porcentajeIva || PORCENTAJE_IVA),
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

export function resumirFacturacion(ventas = []) {
  const completadas = ventas.filter((venta) => esComprobanteFiscal(venta));
  const baseUsd = redondear(completadas.reduce((t, v) => t + Number(v.baseUsd) || 0, 0));
  const baseVes = redondear(completadas.reduce((t, v) => t + Number(v.baseVes) || 0, 0));
  const ivaUsd = redondear(completadas.reduce((t, v) => t + Number(v.ivaUsd) || 0, 0));
  const ivaVes = redondear(completadas.reduce((t, v) => t + Number(v.ivaVes) || 0, 0));
  const igtfUsd = redondear(completadas.reduce((t, v) => t + Number(v.igtfUsd) || 0, 0));
  const igtfVes = redondear(completadas.reduce((t, v) => t + Number(v.igtfVes) || 0, 0));
  const totalUsd = redondear(completadas.reduce((t, v) => t + Number(v.totalUsd) || 0, 0));
  const totalVes = redondear(completadas.reduce((t, v) => t + Number(v.totalVes) || 0, 0));
  const retencionesUsd = redondear(
    completadas.reduce((t, v) => t + Number(v.retencionesUsd) || 0, 0)
  );
  const retencionesVes = redondear(
    completadas.reduce((t, v) => t + Number(v.retencionesVes) || 0, 0)
  );

  return {
    totalComprobantes: completadas.length,
    baseImponibleUsd: baseUsd,
    baseImponibleVes: baseVes,
    ivaUsd,
    ivaVes,
    igtfUsd,
    igtfVes,
    totalUsd,
    totalVes,
    retencionesUsd,
    retencionesVes,
    totalRetenidoUsd: retencionesUsd,
    totalRetenidoVes: retencionesVes,
    tipoIva: PORCENTAJE_IVA,
    tipoIgtf: PORCENTAJE_IGTF,
  };
}
