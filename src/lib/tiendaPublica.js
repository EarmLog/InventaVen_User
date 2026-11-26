const URL_DEFECTO = "https://inventa-ven-user.vercel.app";
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

function limpiarTexto(valor, maximo) {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximo);
}

function limpiarBase64(valor) {
  const texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!texto) return "";
  return texto.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

export function normalizarSlug(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function generarToken() {
  const bytes = new Uint8Array(24);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let indice = 0; indice < bytes.length; indice += 1) {
      bytes[indice] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function urlTienda(slug, token) {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || URL_DEFECTO).replace(/\/+$/, "");
  return `${base}/tienda/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`;
}

export function validarPayloadCatalogo(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return { datos: null, error: "El cuerpo de la petición no es válido." };
  }

  const nombreNegocio = limpiarTexto(cuerpo.nombreNegocio, 160);
  if (!nombreNegocio) {
    return { datos: null, error: "Escribe el nombre del negocio." };
  }

  const slug = normalizarSlug(cuerpo.slug) || normalizarSlug(nombreNegocio);
  if (!slug) {
    return { datos: null, error: "El nombre del negocio no permite crear un enlace válido." };
  }

  const telefono = String(cuerpo.telefono ?? "").replace(/\D/g, "").slice(0, 13) || null;

  const tasa = Number(cuerpo.tasa);
  if (!Number.isFinite(tasa) || tasa <= 0) {
    return { datos: null, error: "La tasa de cambio debe ser un número mayor que cero." };
  }

  if (!Array.isArray(cuerpo.productos)) {
    return { datos: null, error: "La lista de productos no es válida." };
  }

  const productos = [];
  for (const [indice, producto] of cuerpo.productos.entries()) {
    if (!producto || typeof producto !== "object" || Array.isArray(producto)) {
      return { datos: null, error: `El producto ${indice + 1} no es válido.` };
    }

    const id = String(producto.id ?? "").trim();
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) {
      return { datos: null, error: `El identificador del producto ${indice + 1} no es válido.` };
    }

    const nombre = limpiarTexto(producto.nombre, 160);
    if (!nombre) {
      return { datos: null, error: `El producto ${indice + 1} necesita un nombre.` };
    }

    const descripcion = limpiarTexto(producto.descripcion, 500);
    const categoria = limpiarTexto(producto.categoria, 80);
    const precioUsd = Number(producto.precioUsd);
    const precioVes = Number(producto.precioVes);
    if (
      !Number.isFinite(precioUsd) ||
      precioUsd < 0 ||
      !Number.isFinite(precioVes) ||
      precioVes < 0
    ) {
      return { datos: null, error: `Los precios del producto ${indice + 1} no son válidos.` };
    }

    const imagenBase64 = limpiarBase64(producto.imagenBase64);
    if (imagenBase64) {
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imagenBase64)) {
        return { datos: null, error: `La imagen del producto ${indice + 1} no es válida.` };
      }
      if (Math.floor((imagenBase64.length * 3) / 4) > MAX_IMAGEN_BYTES) {
        return { datos: null, error: `La imagen del producto ${indice + 1} supera los 5 MB.` };
      }
    }

    productos.push({
      id,
      nombre,
      descripcion,
      categoria,
      precioUsd,
      precioVes,
      imagenBase64: imagenBase64 || null,
    });
  }

  const identificadores = new Set();
  for (const producto of productos) {
    if (identificadores.has(producto.id)) {
      return { datos: null, error: `El producto ${producto.id} está repetido.` };
    }
    identificadores.add(producto.id);
  }

  return {
    datos: { slug, nombreNegocio, telefono, tasa, productos },
    error: null,
  };
}
