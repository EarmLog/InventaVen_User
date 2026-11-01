import { TIPOS_ERROR_VENTA } from "./constantes";

export function esVentaEnAnalisis(venta) {
  return (
    Boolean(venta) &&
    venta.estado !== "reportada" &&
    venta.estado !== "cancelada" &&
    venta.estado !== "eliminada"
  );
}

export function esVentaReportada(venta) {
  return venta?.estado === "reportada";
}

export function etiquetaTipoError(valor) {
  return (
    TIPOS_ERROR_VENTA.find((tipo) => tipo.valor === valor)?.etiqueta ||
    "Error sin clasificar"
  );
}

export function etiquetaEstadoVenta(estado) {
  if (estado === "reportada") return "Reportada";
  if (estado === "cancelada") return "Cancelada";
  return "Completada";
}
