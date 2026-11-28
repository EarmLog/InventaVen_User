const URL_DEFECTO = "https://inventa-ven-user.vercel.app";
const MAX_VARIANTES = 50;

function limpiarTexto(valor, maximo) {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximo);
}

function limpiarTelegram(valor) {
  const texto = String(valor ?? "")
    .trim()
    .replace(/(?:https?:\/\/)?(?:www\.)?t\.me\//gi, "")
    .split(/[/?#]/)[0]
    .replace(/@/g, "")
    .replace(/[^A-Za-z0-9_]/g, "")
    .slice(0, 32);
  return texto || null;
}

function limpiarInstagram(valor) {
  const texto = String(valor ?? "")
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}\//i, "")
    .split(/[/?#]/)[0]
    .replace(/@/g, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 30);
  return texto || null;
}

function limpiarCorreo(valor) {
  const correo = String(valor ?? "").trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return null;
  return correo;
}

function limpiarNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
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
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function urlTienda(slug, token) {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || URL_DEFECTO).replace(/\/+$/, "");
  return `${base}/tienda/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`;
}

export function variantesSeguras(valor) {
  let origen = valor;
  if (typeof origen === "string") {
    try {
      origen = JSON.parse(origen);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(origen)) return [];
  return origen
    .filter((variante) => variante && typeof variante === "object" && !Array.isArray(variante))
    .slice(0, MAX_VARIANTES)
    .map((variante) => ({
      id: String(variante.id ?? ""),
      nombre: limpiarTexto(variante.nombre, 160),
      sku: limpiarTexto(variante.sku, 80) || null,
      stock: limpiarNumeroPositivo(variante.stock) ?? 0,
      precioUsd: limpiarNumeroPositivo(variante.precioUsd) ?? 0,
      precioVes: limpiarNumeroPositivo(variante.precioVes) ?? 0,
      activo: variante.activo !== false,
    }));
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
  const telegram = limpiarTelegram(cuerpo.telegram);
  const instagram = limpiarInstagram(cuerpo.instagram);
  const correoContacto = limpiarCorreo(cuerpo.correoContacto);
  const horario = limpiarTexto(cuerpo.horario, 240) || null;

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

    const imagenToken = String(producto.imagenToken || "").trim().toLowerCase();
    if (imagenToken && !/^[0-9a-f]{48}$/.test(imagenToken)) {
      return { datos: null, error: `La imagen del producto ${indice + 1} no es válida.` };
    }

    const sku = limpiarTexto(producto.sku, 80) || null;
    const stock = limpiarNumeroPositivo(producto.stock) ?? 0;

    const variantesBrutas = Array.isArray(producto.variantes) ? producto.variantes : [];
    if (variantesBrutas.length > MAX_VARIANTES) {
      return {
        datos: null,
        error: `El producto ${indice + 1} tiene más de ${MAX_VARIANTES} variantes.`,
      };
    }

    const variantes = [];
    for (const [indiceVariante, variante] of variantesBrutas.entries()) {
      if (!variante || typeof variante !== "object" || Array.isArray(variante)) {
        return {
          datos: null,
          error: `La variante ${indiceVariante + 1} del producto ${indice + 1} no es válida.`,
        };
      }

      const idVariante = String(variante.id ?? "").trim();
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(idVariante)) {
        return {
          datos: null,
          error: `El identificador de la variante ${indiceVariante + 1} del producto ${indice + 1} no es válido.`,
        };
      }

      const nombreVariante = limpiarTexto(variante.nombre, 160);
      if (!nombreVariante) {
        return {
          datos: null,
          error: `La variante ${indiceVariante + 1} del producto ${indice + 1} necesita un nombre.`,
        };
      }

      const precioUsdVariante = Number(variante.precioUsd);
      const precioVesVariante = Number(variante.precioVes);
      if (
        !Number.isFinite(precioUsdVariante) ||
        precioUsdVariante < 0 ||
        !Number.isFinite(precioVesVariante) ||
        precioVesVariante < 0
      ) {
        return {
          datos: null,
          error: `Los precios de la variante ${indiceVariante + 1} del producto ${indice + 1} no son válidos.`,
        };
      }

      variantes.push({
        id: idVariante,
        nombre: nombreVariante,
        sku: limpiarTexto(variante.sku, 80) || null,
        stock: limpiarNumeroPositivo(variante.stock) ?? 0,
        precioUsd: precioUsdVariante,
        precioVes: precioVesVariante,
        activo: variante.activo !== false,
      });
    }

    productos.push({
      id,
      nombre,
      descripcion,
      categoria,
      precioUsd,
      precioVes,
      imagenToken: imagenToken || null,
      sku,
      stock,
      variantes,
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
    datos: {
      slug,
      nombreNegocio,
      telefono,
      telegram,
      instagram,
      correoContacto,
      horario,
      tasa,
      productos,
    },
    error: null,
  };
}
