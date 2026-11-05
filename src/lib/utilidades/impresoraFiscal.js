import { formatearUsd, formatearVes } from "./formato";

export const TIPOS_IMPRESORA_FISCAL = [
  { valor: "the_factory", etiqueta: "The Factory (HKA)" },
  { valor: "hasar_bematech", etiqueta: "Hasar / Bematech" },
  { valor: "custom_vmax", etiqueta: "Custom / VMAX" },
];

export function formatearComprobanteFiscal({ venta, perfil = {} }) {
  const baseImponibleUsd = Number(venta?.baseImponibleUsd) || 0;
  const baseImponibleVes = Number(venta?.baseVes) || 0;
  const ivaUsd = Number(venta?.ivaUsd) || 0;
  const ivaVes = Number(venta?.ivaVes) || 0;
  const igtfUsd = Number(venta?.igtfUsd) || 0;
  const igtfVes = Number(venta?.igtfVes) || 0;
  const totalUsd = Number(venta?.totalUsd) || 0;
  const totalVes = Number(venta?.totalVes) || 0;

  const comprobante = {
    numeroFactura: venta?.numeroFactura || venta?.codigo || null,
    tipo: venta?.tipo || "venta",
    fecha: venta?.fecha || null,
    negocio: {
      nombre: perfil?.nombreNegocio || negocioNombre(venta),
      rif: perfil?.rif || "",
      telefono: perfil?.telefono || "",
    },
    cliente: {
      nombre: venta?.clienteNombre || "",
      documento: venta?.clienteDocumento || "",
      rif: venta?.clienteRif || "",
    },
    items: (venta?.items || []).map((item) => ({
      productoId: item.productoId || null,
      varianteId: item.varianteId || null,
      sku: item.sku || "",
      nombre: item.nombre || "",
      cantidad: Number(item.cantidad) || 0,
      precioUnitarioUsd: Number(item.precioUnitarioUsd) || 0,
      precioUnitarioVes: Number(item.precioUnitarioVes) || 0,
      totalLineaUsd: Number(item.totalLineaUsd) || 0,
      totalLineaVes: Number(item.totalLineaVes) || 0,
      costoUnitarioUsd: Number(item.costoUnitarioUsd) || 0,
    })),
    baseImponibleUsd,
    baseImponibleVes,
    ivaUsd,
    ivaVes,
    igtfUsd,
    igtfVes,
    totalUsd,
    totalVes,
    tasaBcv: Number(venta?.tasaUsd) || 0,
    totalRetenidoUsd: Number(venta?.retencionesUsd) || 0,
    totalRetenidoVes: Number(venta?.retencionesVes) || 0,
    estado: "emitido",
    nivel: "B",
    porcentajeIva: Number(venta?.porcentajeIva) || 0,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };

  return comprobante;
}

function negocioNombre(venta) {
  return venta?.negocioNombre || venta?.negocio?.nombre || "";
}

export function validarComprobanteFiscal(comprobante) {
  const errores = [];
  if (!comprobante?.numeroFactura) errores.push("Falta numeroFactura.");
  if (!comprobante?.negocio?.rif) errores.push("Falta RIF del negocio.");
  if (!comprobante?.negocio?.nombre) errores.push("Falta nombre del negocio.");
  if (!Array.isArray(comprobante?.items) || comprobante.items.length === 0) {
    errores.push("Falta desglose de items.");
  }
  return { valido: errores.length === 0, errores };
}

export async function emitirComprobanteFiscal({
  venta,
  perfil = {},
  tipoImpresora = "the_factory",
  datosMaquina = null,
}) {
  const comprobante = formatearComprobanteFiscal({ venta, perfil });
  const adapter = TIPOS_IMPRESORA_FISCAL.find(
    (tipo) => tipo.valor === tipoImpresora
  );
  const adapterNombre = adapter?.etiqueta || "The Factory (HKA)";
  const comandoFiscal = {
    tipo: comprobante.tipo,
    numeroFactura: comprobante.numeroFactura,
    numeroControl: comprobante.numeroFactura,
    registroMaquina: datosMaquina?.registro || "",
    impresora: adapterNombre,
    comprobante,
  };
  return {
    ok: true,
    adapter: adapterNombre,
    comando: comandoFiscal,
    comprobante,
  };
}
