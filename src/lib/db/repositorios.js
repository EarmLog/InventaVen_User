import { db } from "./baseDatos";
import {
  SECUENCIAS,
  CLAVES_AJUSTES,
  TIPOS_PAGO,
  TIPOS_ERROR_VENTA,
} from "@/lib/utilidades/constantes";
import {
  generarId,
  limpiarNumero,
  limpiarTexto,
  redondear,
} from "@/lib/utilidades/formato";
import {
  baseSku,
  construirSkuVariante,
  numeracionCorrelativa,
} from "@/lib/utilidades/sku";
import {
  calcularDescuentoOferta,
  calcularGanancia,
  precioUnitarioVariante,
} from "@/lib/utilidades/precios";
import { construirComprobanteFiscal } from "@/lib/utilidades/fiscalidad";

function validarBaseDatos() {
  if (!db) throw new Error("La base de datos no está disponible.");
  return db;
}

function normalizarSku(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function obtenerAjustes() {
  if (!db) return {};
  const filas = await db.ajustes.toArray();
  return filas.reduce((acumulado, fila) => {
    acumulado[fila.clave] = fila.valor;
    return acumulado;
  }, {});
}

export async function guardarAjuste(clave, valor) {
  if (!db) return;
  await db.ajustes.put({ clave, valor });
}

export async function guardarAjustes(objeto) {
  if (!db) return;
  const filas = Object.entries(objeto).map(([clave, valor]) => ({ clave, valor }));
  await db.ajustes.bulkPut(filas);
}

async function siguienteSecuenciaEnTransaccion(nombre, longitud) {
  const actual = await db.secuencias.get(nombre);
  const siguiente = Number(actual?.valor || 0) + 1;
  await db.secuencias.put({ nombre, valor: siguiente });
  return { valor: siguiente, codigo: numeracionCorrelativa(siguiente, longitud) };
}

export async function previsualizarSiguienteSku(nombre) {
  const base = db ? await db.secuencias.get(SECUENCIAS.PRODUCTOS) : null;
  const siguiente = Number(base?.valor || 0) + 1;
  return `${baseSku(nombre)}-${numeracionCorrelativa(siguiente, 3)}`;
}

export async function previsualizarSiguienteFactura() {
  const base = db ? await db.secuencias.get(SECUENCIAS.FACTURAS) : null;
  const siguiente = Number(base?.valor || 0) + 1;
  return `FAC-${numeracionCorrelativa(siguiente, 6)}`;
}

export async function listarProductos() {
  if (!db) return [];
  return db.productos.orderBy("creadoEn").reverse().toArray();
}

export async function obtenerProducto(id) {
  if (!db) return null;
  return db.productos.get(id);
}

function normalizarVariantes(producto, existentes) {
  const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];
  const usados = existentes.map((variante) => variante.sku);
  return variantes
    .map((variante) => {
      const nombre = limpiarTexto(variante.nombre, 120);
      if (!nombre) return null;
      const sku = variante.sku || construirSkuVariante(producto.sku, nombre, usados);
      usados.push(sku);
      return {
        id: variante.id || generarId(),
        nombre,
        sku,
        stock: Math.max(0, limpiarNumero(variante.stock, 0)),
        precioVentaUsd: Math.max(0, limpiarNumero(variante.precioVentaUsd, 0)),
        precioVentaVes: Math.max(0, limpiarNumero(variante.precioVentaVes, 0)),
        activo: variante.activo !== false,
        creadoEn: variante.creadoEn || new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

export async function guardarProducto(datos) {
  validarBaseDatos();
  const ahora = new Date().toISOString();
  const nombre = limpiarTexto(datos.nombre, 160);
  if (!nombre) throw new Error("El nombre del producto es obligatorio.");

  return db.transaction("rw", db.productos, db.secuencias, async () => {
    const existente = datos.id ? await db.productos.get(datos.id) : null;
    const id = datos.id || generarId();
    const skuSolicitado = normalizarSku(datos.sku);
    let sku = existente?.sku;

    if (skuSolicitado && skuSolicitado !== sku) {
      const duplicado = await db.productos.where("sku").equals(skuSolicitado).first();
      if (duplicado && duplicado.id !== id) {
        throw new Error(
          `El código "${skuSolicitado}" ya está registrado en "${duplicado.nombre}".`
        );
      }
      sku = skuSolicitado;
    }

    if (!sku) {
      const { codigo } = await siguienteSecuenciaEnTransaccion(
        SECUENCIAS.PRODUCTOS,
        3
      );
      sku = `${baseSku(nombre)}-${codigo}`;
    }

    const tasaUsd = Math.max(0, limpiarNumero(datos.tasaUsd, 0));
    let precioCompraUsd = Math.max(0, limpiarNumero(datos.precioCompraUsd, 0));
    let precioCompraVes = Math.max(0, limpiarNumero(datos.precioCompraVes, 0));
    let precioVentaUsd = Math.max(0, limpiarNumero(datos.precioVentaUsd, 0));
    let precioVentaVes = Math.max(0, limpiarNumero(datos.precioVentaVes, 0));

    if (!precioCompraUsd && precioCompraVes && tasaUsd > 0) {
      precioCompraUsd = redondear(precioCompraVes / tasaUsd);
    }
    if (!precioCompraVes && precioCompraUsd && tasaUsd > 0) {
      precioCompraVes = redondear(precioCompraUsd * tasaUsd);
    }
    if (!precioVentaUsd && precioVentaVes && tasaUsd > 0) {
      precioVentaUsd = redondear(precioVentaVes / tasaUsd);
    }
    if (!precioVentaVes && precioVentaUsd && tasaUsd > 0) {
      precioVentaVes = redondear(precioVentaUsd * tasaUsd);
    }

    if (!precioVentaUsd || !precioVentaVes) {
      throw new Error("Debes indicar un precio de venta válido.");
    }

    const productoBase = {
      ...existente,
      ...datos,
      id,
      sku,
      nombre,
      descripcion: limpiarTexto(datos.descripcion, 500),
      categoria: limpiarTexto(datos.categoria, 80) || "Otros",
      tipoEmpaque: datos.tipoEmpaque === "bulto" ? "bulto" : "unidad",
      unidadesPorBulto:
        datos.tipoEmpaque === "bulto"
          ? Math.max(1, Math.round(limpiarNumero(datos.unidadesPorBulto, 1)))
          : 1,
      precioCompraUsd,
      precioCompraVes,
      precioVentaUsd,
      precioVentaVes,
      tasaUsd,
      stockMinimo: Math.max(0, limpiarNumero(datos.stockMinimo, 0)),
      activo: datos.activo !== false,
      ofertaActiva: Boolean(datos.ofertaActiva),
      ofertaCantidad: Math.max(1, Math.round(limpiarNumero(datos.ofertaCantidad, 1))),
      ofertaDescuento: Math.min(
        100,
        Math.max(0, limpiarNumero(datos.ofertaDescuento, 0))
      ),
      creadoEn: existente?.creadoEn || ahora,
      actualizadoEn: ahora,
      fechaRenovacion: existente?.fechaRenovacion || ahora,
      proveedorId: datos.proveedorId || null,
      proveedorNombre: datos.proveedorNombre || null,
    };

    const variantes = normalizarVariantes(productoBase, existente?.variantes || []);
    productoBase.variantes = variantes;
    productoBase.stock =
      variantes.length > 0
        ? redondear(
            variantes.reduce((total, variante) => total + variante.stock, 0),
            3
          )
        : Math.max(0, limpiarNumero(datos.stock, 0));

    await db.productos.put(productoBase);
    return productoBase;
  });
}

export async function eliminarProducto(id) {
  validarBaseDatos();
  await db.productos.delete(id);
}

export async function renovarStock({
  productoId,
  varianteId = null,
  cantidad,
  precioCompraUsd = null,
  precioCompraVes = null,
  tasaUsd = 0,
}) {
  validarBaseDatos();
  const cantidadNumero = Number(cantidad);
  if (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
    throw new Error("La cantidad a renovar debe ser mayor a cero.");
  }

  return db.transaction(
    "rw",
    db.productos,
    db.movimientos,
    async () => {
      const producto = await db.productos.get(productoId);
      if (!producto) throw new Error("El producto no existe.");
      const ahora = new Date().toISOString();

      if (varianteId) {
        const variantes = (producto.variantes || []).map((variante) =>
          variante.id === varianteId
            ? {
                ...variante,
                stock: redondear(variante.stock + cantidadNumero, 3),
                actualizadoEn: ahora,
              }
            : variante
        );
        producto.variantes = variantes;
        producto.stock = redondear(
          variantes.reduce((total, variante) => total + variante.stock, 0),
          3
        );
      } else {
        producto.stock = redondear(Number(producto.stock || 0) + cantidadNumero, 3);
      }

      const tasa = Number(tasaUsd) || Number(producto.tasaUsd) || 0;
      const compraUsd = Number(precioCompraUsd);
      const compraVes = Number(precioCompraVes);
      if (Number.isFinite(compraUsd) && compraUsd > 0) {
        producto.precioCompraUsd = redondear(compraUsd);
        producto.precioCompraVes =
          tasa > 0 ? redondear(compraUsd * tasa) : producto.precioCompraVes;
      } else if (Number.isFinite(compraVes) && compraVes > 0) {
        producto.precioCompraVes = redondear(compraVes);
        producto.precioCompraUsd =
          tasa > 0 ? redondear(compraVes / tasa) : producto.precioCompraUsd;
      }
      if (tasa > 0) producto.tasaUsd = tasa;
      producto.fechaRenovacion = ahora;
      producto.actualizadoEn = ahora;

      await db.productos.put(producto);
      await db.movimientos.add({
        id: generarId(),
        productoId,
        varianteId,
        tipo: "renovacion",
        cantidad: cantidadNumero,
        fecha: ahora,
      });
      return producto;
    }
  );
}

export async function registrarVenta({
  items,
  tipoPago = "efectivo",
  clienteNombre = "",
  clienteDocumento = "",
  notas = "",
  tasaUsd = 0,
  montoRecibidoVes = 0,
  aplicarIva = false,
  porcentajeIva = 0,
}) {
  validarBaseDatos();
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Agrega al menos un producto a la venta.");
  }
  const tipoValido = TIPOS_PAGO.some((tipo) => tipo.valor === tipoPago)
    ? tipoPago
    : "efectivo";

  const venta = await db.transaction(
    "rw",
    db.productos,
    db.ventas,
    db.secuencias,
    db.movimientos,
    async () => {
      const ahora = new Date().toISOString();
      const ventaId = generarId();
      const secuenciaVenta = await siguienteSecuenciaEnTransaccion(SECUENCIAS.VENTAS, 6);
      const secuenciaFactura = await siguienteSecuenciaEnTransaccion(
        SECUENCIAS.FACTURAS,
        6
      );
      const tasa = Math.max(0, Number(tasaUsd) || 0);
      const porcentajeIvaAplicado = aplicarIva
        ? Math.min(100, Math.max(0, Number(porcentajeIva) || 0))
        : 0;
      const itemsVenta = [];

      for (const item of items) {
        const producto = await db.productos.get(item.productoId);
        if (!producto || producto.activo === false) {
          throw new Error("Uno de los productos ya no está disponible.");
        }
        const cantidad = Number(item.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error("La cantidad de un producto no es válida.");
        }
        const variante = item.varianteId
          ? (producto.variantes || []).find(
              (registro) => registro.id === item.varianteId
            )
          : null;
        if (item.varianteId && !variante) {
          throw new Error("La variante del producto ya no existe.");
        }
        if (!item.varianteId && (producto.variantes || []).length > 0) {
          throw new Error("Debes seleccionar una variante del producto.");
        }
        const stockDisponible = Number(variante ? variante.stock : producto.stock) || 0;
        if (cantidad > stockDisponible) {
          throw new Error(
            `Stock insuficiente de "${producto.nombre}". Disponible: ${stockDisponible}.`
          );
        }

        const precios = precioUnitarioVariante(producto, variante);
        const descuentoPorcentaje = producto.ofertaActiva
          ? calcularDescuentoOferta(
              cantidad,
              producto.ofertaCantidad,
              producto.ofertaDescuento
            )
          : 0;
        const subtotalUsd = redondear(precios.usd * cantidad);
        const subtotalVes = redondear(precios.ves * cantidad);
        const descuentoUsd = redondear((subtotalUsd * descuentoPorcentaje) / 100);
        const descuentoVes = redondear((subtotalVes * descuentoPorcentaje) / 100);
        const totalLineaUsd = redondear(subtotalUsd - descuentoUsd);
        const totalLineaVes = redondear(subtotalVes - descuentoVes);
        const costoUnitarioUsd = Number(producto.precioCompraUsd) || 0;

        itemsVenta.push({
          productoId: producto.id,
          varianteId: variante?.id || null,
          nombre: producto.nombre,
          variante: variante?.nombre || null,
          sku: variante?.sku || producto.sku,
          categoria: producto.categoria || "Otros",
          tipoEmpaque: producto.tipoEmpaque,
          unidadesPorBulto: producto.unidadesPorBulto,
          cantidad,
          precioUnitarioUsd: precios.usd,
          precioUnitarioVes: precios.ves,
          costoUnitarioUsd,
          costoTotalUsd: redondear(costoUnitarioUsd * cantidad),
          descuentoPorcentaje,
          subtotalUsd,
          subtotalVes,
          totalLineaUsd,
          totalLineaVes,
        });

        if (variante) {
          const variantesActualizadas = producto.variantes.map((registro) =>
            registro.id === variante.id
              ? {
                  ...registro,
                  stock: redondear(registro.stock - cantidad, 3),
                  actualizadoEn: ahora,
                }
              : registro
          );
          producto.variantes = variantesActualizadas;
          producto.stock = redondear(
            variantesActualizadas.reduce(
              (total, registro) => total + registro.stock,
              0
            ),
            3
          );
        } else {
          producto.stock = redondear(Number(producto.stock) - cantidad, 3);
        }
        producto.actualizadoEn = ahora;
        await db.productos.put(producto);
        await db.movimientos.add({
          id: generarId(),
          productoId: producto.id,
          varianteId: variante?.id || null,
          tipo: "venta",
          cantidad: -cantidad,
          ventaId,
          fecha: ahora,
        });
      }

      const subtotalUsd = redondear(
        itemsVenta.reduce((total, item) => total + item.subtotalUsd, 0)
      );
      const subtotalVes = redondear(
        itemsVenta.reduce((total, item) => total + item.subtotalVes, 0)
      );
      const descuentoUsd = redondear(
        itemsVenta.reduce((total, item) => total + item.subtotalUsd - item.totalLineaUsd, 0)
      );
      const descuentoVes = redondear(
        itemsVenta.reduce((total, item) => total + item.subtotalVes - item.totalLineaVes, 0)
      );
      const baseUsd = redondear(
        itemsVenta.reduce((total, item) => total + item.totalLineaUsd, 0)
      );
      const baseVes = redondear(
        itemsVenta.reduce((total, item) => total + item.totalLineaVes, 0)
      );
      const ivaUsd = redondear((baseUsd * porcentajeIvaAplicado) / 100);
      const ivaVes = redondear((baseVes * porcentajeIvaAplicado) / 100);
      const totalUsd = redondear(baseUsd + ivaUsd);
      const totalVes = redondear(baseVes + ivaVes);
      const costoTotalUsd = redondear(
        itemsVenta.reduce((total, item) => total + item.costoTotalUsd, 0)
      );
      const gananciaUsd = redondear(baseUsd - costoTotalUsd);

      const venta = {
        id: ventaId,
        codigo: `VENTA-${secuenciaVenta.codigo}`,
        numeroFactura: `FAC-${secuenciaFactura.codigo}`,
        fecha: ahora,
        estado: "completada",
        tipoPago: tipoValido,
        clienteNombre: limpiarTexto(clienteNombre, 160),
        clienteDocumento: limpiarTexto(clienteDocumento, 40),
        notas: limpiarTexto(notas, 500),
        items: itemsVenta,
        subtotalUsd,
        subtotalVes,
        descuentoUsd,
        descuentoVes,
        baseUsd,
        baseVes,
        porcentajeIva: porcentajeIvaAplicado,
        ivaUsd,
        ivaVes,
        totalUsd,
        totalVes,
        costoTotalUsd,
        gananciaUsd,
        tasaUsd: tasa,
        montoRecibidoVes: Math.max(0, Number(montoRecibidoVes) || 0),
        vueltoVes: Math.max(
          0,
          redondear((Number(montoRecibidoVes) || 0) - totalVes)
        ),
        creadoEn: ahora,
        actualizadoEn: ahora,
        historialEdiciones: [],
      };
      await db.ventas.add(venta);
      return venta;
    }
  );

  const comprobante = construirComprobanteFiscal(venta, "venta");
  const ajustesLocales = await obtenerAjustes();
  await guardarFacturaFiscal({
    ...comprobante,
    nivel: "B",
    estado: "enviada",
    registroMaquina: "MAQ-0001",
    negocioRif: String(ajustesLocales?.[CLAVES_AJUSTES.RIF_NEGOCIO] || ""),
  });

  return venta;
}

function validarTipoError(tipo) {
  const valido = TIPOS_ERROR_VENTA.some((registro) => registro.valor === tipo);
  if (!valido) throw new Error("Selecciona un tipo de error válido.");
  return tipo;
}

export async function reportarErrorVenta(id, { tipo, nota = "" } = {}) {
  validarBaseDatos();
  const tipoValido = validarTipoError(tipo);

  return db.transaction("rw", db.ventas, async () => {
    const venta = await db.ventas.get(id);
    if (!venta) throw new Error("La venta no existe.");
    if (venta.estado === "reportada") {
      throw new Error("Esta venta ya fue reportada anteriormente.");
    }
    if (venta.estado === "cancelada") {
      throw new Error("No se puede reportar una venta cancelada.");
    }

    const ahora = new Date().toISOString();
    const actualizada = {
      ...venta,
      estado: "reportada",
      reporte: {
        tipo: tipoValido,
        nota: limpiarTexto(nota, 500),
        reportadaEn: ahora,
      },
      actualizadoEn: ahora,
    };
    await db.ventas.put(actualizada);
    return actualizada;
  });
}

export async function actualizarVentaReportada(id, cambios = {}) {
  validarBaseDatos();
  return db.transaction("rw", db.ventas, async () => {
    const venta = await db.ventas.get(id);
    if (!venta) throw new Error("La venta no existe.");
    if (venta.estado !== "reportada") {
      throw new Error("La venta ya no se encuentra en pendientes.");
    }

    const ahora = new Date().toISOString();
    const tipoPagoValido = TIPOS_PAGO.some((tipo) => tipo.valor === cambios.tipoPago)
      ? cambios.tipoPago
      : venta.tipoPago;
    const tipoError = TIPOS_ERROR_VENTA.some(
      (registro) => registro.valor === cambios.tipoError
    )
      ? cambios.tipoError
      : venta.reporte?.tipo || "otro";

    const actualizada = {
      ...venta,
      clienteNombre: limpiarTexto(cambios.clienteNombre, 160),
      clienteDocumento: limpiarTexto(cambios.clienteDocumento, 40),
      notas: limpiarTexto(cambios.notas, 500),
      tipoPago: tipoPagoValido,
      reporte: {
        ...venta.reporte,
        tipo: tipoError,
        nota: limpiarTexto(cambios.notaError, 500),
        actualizadoEn: ahora,
      },
      actualizadoEn: ahora,
      historialEdiciones: [
        ...(venta.historialEdiciones || []),
        { fecha: ahora, campos: ["cliente", "pago", "notas", "reporte"] },
      ],
    };
    await db.ventas.put(actualizada);
    return actualizada;
  });
}

function archivarReporte(venta, accion, ahora, extra = {}) {
  return [
    ...(venta.historialReportes || []),
    {
      ...(venta.reporte || {}),
      accion,
      fechaAccion: ahora,
      ...extra,
    },
  ];
}

export async function restablecerVentaReportada(id) {
  validarBaseDatos();
  return db.transaction("rw", db.ventas, async () => {
    const venta = await db.ventas.get(id);
    if (!venta) throw new Error("La venta no existe.");
    if (venta.estado !== "reportada") {
      throw new Error("La venta ya no se encuentra en pendientes.");
    }

    const ahora = new Date().toISOString();
    const actualizada = {
      ...venta,
      estado: "completada",
      reporte: null,
      restablecidaEn: ahora,
      actualizadoEn: ahora,
      historialReportes: archivarReporte(venta, "restablecida", ahora),
    };
    await db.ventas.put(actualizada);
    return actualizada;
  });
}

export async function renovarVentaReportada(id) {
  validarBaseDatos();
  return db.transaction("rw", db.ventas, db.secuencias, async () => {
    const venta = await db.ventas.get(id);
    if (!venta) throw new Error("La venta no existe.");
    if (venta.estado !== "reportada") {
      throw new Error("La venta ya no se encuentra en pendientes.");
    }

    const ahora = new Date().toISOString();
    const secuencia = await siguienteSecuenciaEnTransaccion(SECUENCIAS.FACTURAS, 6);
    const numeroAnterior = venta.numeroFactura;
    const actualizada = {
      ...venta,
      estado: "completada",
      numeroFactura: `FAC-${secuencia.codigo}`,
      numeroFacturaAnterior: numeroAnterior,
      reporte: null,
      renovadaEn: ahora,
      actualizadoEn: ahora,
      historialReportes: archivarReporte(venta, "renovada", ahora, {
        numeroFacturaAnterior: numeroAnterior,
        numeroFacturaNueva: `FAC-${secuencia.codigo}`,
      }),
    };
    await db.ventas.put(actualizada);
    return actualizada;
  });
}

export async function eliminarVentaReportada(id) {
  validarBaseDatos();
  return db.transaction("rw", db.ventas, async () => {
    const venta = await db.ventas.get(id);
    if (!venta) throw new Error("La venta no existe.");
    if (venta.estado !== "reportada") {
      throw new Error("Solo se pueden eliminar ventas reportadas.");
    }
    await db.ventas.delete(id);
    return venta;
  });
}

export async function actualizarVenta(id, cambios) {
  validarBaseDatos();
  return db.transaction("rw", db.ventas, async () => {
    const venta = await db.ventas.get(id);
    if (!venta) throw new Error("La venta no existe.");
    if (venta.estado === "cancelada") {
      throw new Error("No se puede editar una venta cancelada.");
    }
    const ahora = new Date().toISOString();
    const tipoPagoValido = TIPOS_PAGO.some((tipo) => tipo.valor === cambios.tipoPago)
      ? cambios.tipoPago
      : venta.tipoPago;
    const actualizada = {
      ...venta,
      clienteNombre: limpiarTexto(cambios.clienteNombre, 160),
      clienteDocumento: limpiarTexto(cambios.clienteDocumento, 40),
      notas: limpiarTexto(cambios.notas, 500),
      tipoPago: tipoPagoValido,
      actualizadoEn: ahora,
      historialEdiciones: [
        ...(venta.historialEdiciones || []),
        { fecha: ahora, campos: ["cliente", "pago", "notas"] },
      ],
    };
    await db.ventas.put(actualizada);
    return actualizada;
  });
}

export async function actualizarPreciosPorTasa(nuevaTasa) {
  validarBaseDatos();
  const tasa = Number(nuevaTasa);
  if (!Number.isFinite(tasa) || tasa <= 0) {
    throw new Error("La tasa del dólar no es válida.");
  }
  let actualizados = 0;
  await db.transaction("rw", db.productos, db.ajustes, async () => {
    const productos = await db.productos.toArray();
    const ahora = new Date().toISOString();
    for (const producto of productos) {
      const precioCompraUsd = Number(producto.precioCompraUsd) || 0;
      const precioVentaUsd = Number(producto.precioVentaUsd) || 0;
      if (precioCompraUsd <= 0 && precioVentaUsd <= 0) continue;
      const variantes = (producto.variantes || []).map((variante) => {
        const ventaUsd = Number(variante.precioVentaUsd) || 0;
        if (ventaUsd <= 0) return variante;
        return {
          ...variante,
          precioVentaVes: redondear(ventaUsd * tasa),
          actualizadoEn: ahora,
        };
      });
      await db.productos.put({
        ...producto,
        precioCompraVes: redondear(precioCompraUsd * tasa),
        precioVentaVes: redondear(precioVentaUsd * tasa),
        variantes,
        tasaUsd: tasa,
        actualizadoEn: ahora,
      });
      actualizados += 1;
    }
    await db.ajustes.put({
      clave: CLAVES_AJUSTES.ULTIMA_ACTUALIZACION_PRECIOS,
      valor: ahora,
    });
    await db.ajustes.put({
      clave: CLAVES_AJUSTES.TASA_ULTIMA_APLICADA,
      valor: tasa,
    });
  });
  return actualizados;
}

export function calcularResumenGanancia(producto, tasaUsd = 0) {
  return calcularGanancia(
    producto?.precioCompraUsd,
    producto?.precioVentaUsd,
    tasaUsd || producto?.tasaUsd
  );
}

export async function guardarFacturaFiscal(fiscal) {
  validarBaseDatos();
  if (!fiscal) throw new Error("La factura fiscal no es válida.");
  const registro = { ...fiscal, id: fiscal.id || generarId() };
  return db.facturasFiscales.put(registro);
}

export async function listarFacturasFiscales() {
  validarBaseDatos();
  return db.facturasFiscales.orderBy("fecha").reverse().toArray();
}

export async function registrarAuditoria({
  usuarioId = "local",
  accion,
  entidad,
  entidadId = null,
  detalle = "",
}) {
  validarBaseDatos();
  if (!accion || !entidad) throw new Error("La auditoría requiere acción y entidad.");
  const ahora = new Date().toISOString();
  const registro = {
    id: generarId(),
    usuarioId,
    accion,
    entidad,
    entidadId,
    fecha: ahora,
    detalle: detalle || "",
  };
  await db.auditorias.add(registro);
  return registro;
}

export async function listarAuditorias({ usuarioId = "local" } = {}) {
  validarBaseDatos();
  const coleccion = db.auditorias;
  const registros = await (usuarioId
    ? coleccion.where("usuarioId").equals(usuarioId).toArray()
    : coleccion.toArray());
  return registros.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

export async function registrarOperacionEspeciale({
  tipo,
  entidadId = null,
  entidadTipo = null,
  detalle = "",
}) {
  validarBaseDatos();
  if (!tipo) throw new Error("La operación especial requiere un tipo.");
  const ahora = new Date().toISOString();
  const registro = {
    id: generarId(),
    tipo,
    entidadId,
    entidadTipo,
    fecha: ahora,
    detalle: detalle || "",
    estado: "registrada",
  };
  await db.operacionesEspeciales.add(registro);
  return registro;
}

export async function listarOperacionesEspeciales() {
  validarBaseDatos();
  return db.operacionesEspeciales.orderBy("fecha").reverse().toArray();
}
