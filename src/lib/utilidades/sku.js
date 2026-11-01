import { normalizarTextoSku } from "./formato";

export function baseSku(nombre) {
  const limpio = normalizarTextoSku(nombre);
  if (!limpio) return "PRO";
  return limpio.slice(0, 3).padEnd(3, "X");
}

export function sufijoVariante(nombre) {
  const limpio = normalizarTextoSku(nombre);
  if (!limpio) return "VAR";
  return limpio.slice(0, 4).padEnd(3, "X");
}

export function numeracionCorrelativa(valor, longitud = 3) {
  return String(Number(valor) || 0).padStart(longitud, "0");
}

export function construirSkuVariante(skuProducto, nombreVariante, usados = []) {
  const base = `${skuProducto}-${sufijoVariante(nombreVariante)}`;
  const setUsados = new Set(usados.map((sku) => String(sku).toUpperCase()));
  if (!setUsados.has(base.toUpperCase())) return base;
  let contador = 2;
  while (setUsados.has(`${base}-${contador}`.toUpperCase())) {
    contador += 1;
  }
  return `${base}-${contador}`;
}

export function extraerCorrelativoSku(sku) {
  const coincidencia = String(sku || "").match(/-(\d{3,})(?:-|$)/);
  return coincidencia ? Number(coincidencia[1]) : 0;
}
