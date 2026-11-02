import { PORCENTAJE_IVA } from "./constantes";
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

export function construirComprobanteFiscal(venta, tipo = "venta") {
  const tipoValido =
    TIPOS_COMPROBANTE_FISCAL.some((registro) => registro.valor === tipo) ? tipo : "venta";
  const baseUsd = Number(venta?.baseUsd) || 0;
  const baseVes = Number(venta?.baseVes) || 0;
  const ivaUsd = tipoValido === "exencion" ? 0 : Number(venta?.ivaUsd) || 0;
  const ivaVes = tipoValido === "exencion" ? 0 : Number(venta?.ivaVes) || 0;
  const totalUsd = Number(venta?.totalUsd) || 0;
  const totalVes = Number(venta?.totalVes) || 0;

  return {
    ventaId: venta?.id || null,
    numeroFactura: venta?.numeroFactura || null,
    tipo: tipoValido,
    fecha: venta?.fecha || null,
    baseImponibleUsd: tipoValido === "retencion" || tipoValido === "exencion" ? 0 : baseUsd,
    baseImponibleVes: tipoValido === "retencion" || tipoValido === "exencion" ? 0 : baseVes,
    ivaUsd: redondear(tipoValido === "exencion" ? 0 : ivaUsd),
    ivaVes: redondear(tipoValido === "exencion" ? 0 : ivaVes),
    totalUsd: redondear(
      tipoValido === "retencion" || tipoValido === "exencion" ? 0 : totalUsd
    ),
    totalVes: redondear(
      tipoValido === "retencion" || tipoValido === "exencion" ? 0 : totalVes
    ),
    estado: "emitido",
    porcentajeIva: tipoValido === "exencion" ? 0 : Number(venta?.porcentajeIva || PORCENTAJE_IVA),
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

export function resumirFacturacion(ventas = []) {
  const completadas = ventas.filter((venta) => esComprobanteFiscal(venta));
  const baseUsd = redondear(
    completadas.reduce((total, venta) => total + Number(venta.baseUsd) || 0, 0)
  );
  const baseVes = redondear(
    completadas.reduce((total, venta) => total + Number(venta.baseVes) || 0, 0)
  );
  const ivaUsd = redondear(
    completadas.reduce((total, venta) => total + Number(venta.ivaUsd) || 0, 0)
  );
  const ivaVes = redondear(
    completadas.reduce((total, venta) => total + Number(venta.ivaVes) || 0, 0)
  );
  const totalUsd = redondear(
    completadas.reduce((total, venta) => total + Number(venta.totalUsd) || 0, 0)
  );
  const totalVes = redondear(
    completadas.reduce((total, venta) => total + Number(venta.totalVes) || 0, 0)
  );

  return {
    totalComprobantes: completadas.length,
    baseImponibleUsd: baseUsd,
    baseImponibleVes: baseVes,
    ivaUsd,
    ivaVes,
    totalUsd,
    totalVes,
    tipoIva: PORCENTAJE_IVA,
  };
}
