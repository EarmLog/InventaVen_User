import { redondear } from "./formato";

export function calcularPrecioDual(valor, moneda, tasaUsd) {
  const numero = Number(valor) || 0;
  const tasa = Number(tasaUsd) || 0;
  if (!tasa) {
    return { usd: moneda === "USD" ? numero : 0, ves: moneda === "VES" ? numero : 0 };
  }
  if (moneda === "USD") {
    return { usd: redondear(numero), ves: redondear(numero * tasa) };
  }
  return { usd: redondear(numero / tasa), ves: redondear(numero) };
}

export function calcularGanancia(precioCompraUsd, precioVentaUsd, tasaUsd = 0) {
  const compraUsd = Number(precioCompraUsd) || 0;
  const ventaUsd = Number(precioVentaUsd) || 0;
  const gananciaUsd = redondear(ventaUsd - compraUsd);
  const margen = ventaUsd > 0 ? redondear((gananciaUsd / ventaUsd) * 100) : 0;
  return {
    gananciaUsd,
    gananciaVes: redondear(gananciaUsd * (Number(tasaUsd) || 0)),
    margenPorcentaje: margen,
  };
}

export function calcularDescuentoOferta(cantidad, ofertaCantidad, ofertaDescuento) {
  const cantidadNumero = Number(cantidad) || 0;
  const cantidadMinima = Number(ofertaCantidad) || 0;
  const descuento = Number(ofertaDescuento) || 0;
  if (cantidadMinima > 0 && cantidadNumero >= cantidadMinima && descuento > 0) {
    return Math.min(descuento, 100);
  }
  return 0;
}

export function precioConDescuento(precio, descuentoPorcentaje) {
  const descuento = Number(descuentoPorcentaje) || 0;
  return redondear((Number(precio) || 0) * (1 - descuento / 100));
}

export function etiquetaEmpaque(producto) {
  if (producto?.tipoEmpaque === "bulto") {
    const unidades = Number(producto.unidadesPorBulto) || 1;
    return `Bulto x${unidades}`;
  }
  return "Unidad";
}

export function precioUnitarioVariante(producto, variante) {
  const ventaUsd = Number(variante?.precioVentaUsd) || Number(producto?.precioVentaUsd) || 0;
  const ventaVes =
    Number(variante?.precioVentaVes) || Number(producto?.precioVentaVes) || 0;
  return { usd: redondear(ventaUsd), ves: redondear(ventaVes) };
}
