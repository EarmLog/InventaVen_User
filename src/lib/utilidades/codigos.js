export function normalizarCodigo(valor) {
  return String(valor || "").trim().toLowerCase();
}

export function coincideConProducto(producto, codigo) {
  const buscado = normalizarCodigo(codigo);
  if (!buscado) return false;
  if (normalizarCodigo(producto?.sku) === buscado) return true;
  if (normalizarCodigo(producto?.codigoBarra) === buscado) return true;
  if (normalizarCodigo(producto?.codigoBarras) === buscado) return true;
  return false;
}

export function buscarPorCodigo(productos, codigo) {
  const buscado = normalizarCodigo(codigo);
  if (!buscado) return null;
  for (const producto of productos || []) {
    if (coincideConProducto(producto, buscado)) {
      return { producto, variante: null };
    }
    const variante = (producto.variantes || []).find(
      (registro) =>
        normalizarCodigo(registro.sku) === buscado ||
        normalizarCodigo(registro.codigoBarras) === buscado
    );
    if (variante) {
      return { producto, variante };
    }
  }
  return null;
}
