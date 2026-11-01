import * as XLSX from "xlsx";
import JSZip from "jszip";
import { db } from "./baseDatos";
import { SECUENCIAS, NOMBRE_APP } from "@/lib/utilidades/constantes";
import { calcularGanancia } from "@/lib/utilidades/precios";
import { formatearFechaHora, generarId } from "@/lib/utilidades/formato";

function crearHoja(filas, columnas) {
  if (!filas || filas.length === 0) {
    return XLSX.utils.aoa_to_sheet([columnas]);
  }
  return XLSX.utils.json_to_sheet(filas, { header: columnas });
}

function libroConHojas(hojas) {
  const libro = XLSX.utils.book_new();
  Object.entries(hojas).forEach(([nombre, hoja]) => {
    XLSX.utils.book_append_sheet(libro, hoja, nombre.slice(0, 31));
  });
  return libro;
}

function filasProductos(productos) {
  return productos.map((producto) => {
    const ganancia = calcularGanancia(
      producto.precioCompraUsd,
      producto.precioVentaUsd,
      producto.tasaUsd
    );
    return {
      ID: producto.id,
      SKU: producto.sku,
      Nombre: producto.nombre,
      "Categoría": producto.categoria,
      Empaque: producto.tipoEmpaque === "bulto" ? "Bulto" : "Unidad",
      "Unidades por bulto": producto.unidadesPorBulto || 1,
      Stock: producto.stock,
      "Stock mínimo": producto.stockMinimo,
      "Compra USD": producto.precioCompraUsd,
      "Compra VES": producto.precioCompraVes,
      "Venta USD": producto.precioVentaUsd,
      "Venta VES": producto.precioVentaVes,
      "Ganancia USD": ganancia.gananciaUsd,
      "Ganancia VES": ganancia.gananciaVes,
      "Oferta activa": producto.ofertaActiva ? "Sí" : "No",
      "Cantidad mínima oferta": producto.ofertaCantidad,
      "Descuento oferta %": producto.ofertaDescuento,
      Activo: producto.activo ? "Sí" : "No",
      Creado: formatearFechaHora(producto.creadoEn),
      Actualizado: formatearFechaHora(producto.actualizadoEn),
      "Última renovación": formatearFechaHora(producto.fechaRenovacion),
      "Datos JSON": JSON.stringify(producto),
    };
  });
}

function filasVariantes(productos) {
  const filas = [];
  productos.forEach((producto) => {
    (producto.variantes || []).forEach((variante) => {
      filas.push({
        Producto: producto.nombre,
        "SKU producto": producto.sku,
        Variante: variante.nombre,
        "SKU variante": variante.sku,
        Stock: variante.stock,
        "Venta USD": variante.precioVentaUsd,
        "Venta VES": variante.precioVentaVes,
        Activo: variante.activo ? "Sí" : "No",
        "Datos JSON": JSON.stringify(variante),
      });
    });
  });
  return filas;
}

function filasVentas(ventas) {
  return ventas.map((venta) => ({
    Factura: venta.numeroFactura,
    Venta: venta.codigo,
    Fecha: formatearFechaHora(venta.fecha),
    Cliente: venta.clienteNombre || "",
    Documento: venta.clienteDocumento || "",
    "Tipo de pago": venta.tipoPago,
    Estado: venta.estado,
    "Cantidad de ítems": (venta.items || []).length,
    "Subtotal USD": venta.subtotalUsd,
    "Descuento USD": venta.descuentoUsd,
    "IVA USD": venta.ivaUsd || 0,
    "IVA VES": venta.ivaVes || 0,
    "Total USD": venta.totalUsd,
    "Total VES": venta.totalVes,
    "Tasa USD": venta.tasaUsd,
    "Ganancia USD": venta.gananciaUsd,
    Notas: venta.notas || "",
    "Datos JSON": JSON.stringify(venta),
  }));
}

function filasDetalleVentas(ventas) {
  const filas = [];
  ventas.forEach((venta) => {
    (venta.items || []).forEach((item) => {
      filas.push({
        Factura: venta.numeroFactura,
        Venta: venta.codigo,
        SKU: item.sku,
        Producto: item.nombre,
        Variante: item.variante || "",
        Cantidad: item.cantidad,
        "Precio unitario USD": item.precioUnitarioUsd,
        "Precio unitario VES": item.precioUnitarioVes,
        "Descuento %": item.descuentoPorcentaje,
        "Total línea USD": item.totalLineaUsd,
        "Total línea VES": item.totalLineaVes,
        "Costo unitario USD": item.costoUnitarioUsd,
      });
    });
  });
  return filas;
}

function filasAjustes(ajustes) {
  return Object.entries(ajustes).map(([clave, valor]) => ({
    Clave: clave,
    Valor:
      typeof valor === "object" && valor !== null
        ? JSON.stringify(valor)
        : String(valor ?? ""),
  }));
}

export async function generarRespaldoZip() {
  if (!db) throw new Error("La base de datos no está disponible.");
  const [productos, ventas, ajustesFilas, secuencias, movimientos] =
    await Promise.all([
      db.productos.toArray(),
      db.ventas.toArray(),
      db.ajustes.toArray(),
      db.secuencias.toArray(),
      db.movimientos.toArray(),
    ]);
  const ajustes = ajustesFilas.reduce((acumulado, fila) => {
    acumulado[fila.clave] = fila.valor;
    return acumulado;
  }, {});

  const datos = {
    app: NOMBRE_APP,
    version: 1,
    exportadoEn: new Date().toISOString(),
    productos,
    ventas,
    ajustes,
    secuencias,
    movimientos,
  };

  const libros = {
    Inventario: libroConHojas({
      Productos: crearHoja(filasProductos(productos), [
        "ID",
        "SKU",
        "Nombre",
        "Categoría",
        "Empaque",
        "Unidades por bulto",
        "Stock",
        "Stock mínimo",
        "Compra USD",
        "Compra VES",
        "Venta USD",
        "Venta VES",
        "Ganancia USD",
        "Ganancia VES",
        "Oferta activa",
        "Cantidad mínima oferta",
        "Descuento oferta %",
        "Activo",
        "Creado",
        "Actualizado",
        "Última renovación",
        "Datos JSON",
      ]),
      Variantes: crearHoja(filasVariantes(productos), [
        "Producto",
        "SKU producto",
        "Variante",
        "SKU variante",
        "Stock",
        "Venta USD",
        "Venta VES",
        "Activo",
        "Datos JSON",
      ]),
    }),
    Ventas: libroConHojas({
      Ventas: crearHoja(filasVentas(ventas), [
        "Factura",
        "Venta",
        "Fecha",
        "Cliente",
        "Documento",
        "Tipo de pago",
        "Estado",
        "Cantidad de ítems",
        "Subtotal USD",
        "Descuento USD",
        "Total USD",
        "Total VES",
        "Tasa USD",
        "Ganancia USD",
        "Notas",
        "Datos JSON",
      ]),
      Detalle: crearHoja(filasDetalleVentas(ventas), [
        "Factura",
        "Venta",
        "SKU",
        "Producto",
        "Variante",
        "Cantidad",
        "Precio unitario USD",
        "Precio unitario VES",
        "Descuento %",
        "Total línea USD",
        "Total línea VES",
        "Costo unitario USD",
      ]),
    }),
    Configuracion: libroConHojas({
      Ajustes: crearHoja(filasAjustes(ajustes), ["Clave", "Valor"]),
      Secuencias: crearHoja(secuencias, ["nombre", "valor"]),
    }),
  };

  const zip = new JSZip();
  Object.entries(libros).forEach(([nombre, libro]) => {
    const contenido = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    zip.file(`${nombre}.xlsx`, contenido);
  });
  zip.file("respaldo.json", JSON.stringify(datos, null, 2));
  zip.file(
    "LEEME.txt",
    [
      `${NOMBRE_APP} - Respaldo de datos`,
      `Generado: ${formatearFechaHora(datos.exportadoEn)}`,
      "",
      "Este paquete contiene:",
      "- respaldo.json: datos completos usados para restaurar con exactitud.",
      "- Inventario.xlsx: productos y variantes para revisión humana.",
      "- Ventas.xlsx: ventas y detalle de cada factura.",
      "- Configuracion.xlsx: ajustes y correlativos.",
      "",
      "Puedes restaurar este ZIP desde Configuración > Copia de seguridad.",
    ].join("\n")
  );

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const fecha = new Date().toISOString().slice(0, 10);
  return { blob, nombre: `${NOMBRE_APP}_respaldo_${fecha}.zip` };
}

export async function descargarRespaldo() {
  const { blob, nombre } = await generarRespaldoZip();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
  return nombre;
}

function leerHoja(libro, nombre) {
  const hoja = libro.Sheets[nombre];
  if (!hoja) return [];
  return XLSX.utils.sheet_to_json(hoja, { defval: "" });
}

async function cargarDatosDesdeZip(zip) {
  const entradaJson = zip.file("respaldo.json");
  if (entradaJson) {
    const contenido = await entradaJson.async("string");
    const datos = JSON.parse(contenido);
    return {
      productos: Array.isArray(datos.productos) ? datos.productos : [],
      ventas: Array.isArray(datos.ventas) ? datos.ventas : [],
      ajustes: datos.ajustes && typeof datos.ajustes === "object" ? datos.ajustes : {},
      secuencias: Array.isArray(datos.secuencias) ? datos.secuencias : [],
      movimientos: Array.isArray(datos.movimientos) ? datos.movimientos : [],
    };
  }

  const archivoInventario = zip.file("Inventario.xlsx");
  const archivoVentas = zip.file("Ventas.xlsx");
  if (!archivoInventario || !archivoVentas) {
    throw new Error(
      "El ZIP no contiene un respaldo válido de InventaVen (falta respaldo.json o los Excel)."
    );
  }
  const libroInventario = XLSX.read(await archivoInventario.async("array"), {
    type: "array",
  });
  const libroVentas = XLSX.read(await archivoVentas.async("array"), {
    type: "array",
  });
  const productos = leerHoja(libroInventario, "Productos")
    .map((fila) => {
      try {
        return fila["Datos JSON"] ? JSON.parse(fila["Datos JSON"]) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const ventas = leerHoja(libroVentas, "Ventas")
    .map((fila) => {
      try {
        return fila["Datos JSON"] ? JSON.parse(fila["Datos JSON"]) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return {
    productos,
    ventas,
    ajustes: {},
    secuencias: [],
    movimientos: [],
  };
}

function maximaSecuenciaDesdeDatos(productos, ventas, nombre) {
  if (nombre === SECUENCIAS.PRODUCTOS) {
    return productos.reduce((maximo, producto) => {
      const coincidencia = String(producto.sku || "").match(/-(\d{3,})(?:-|$)/);
      return Math.max(maximo, coincidencia ? Number(coincidencia[1]) : 0);
    }, 0);
  }
  if (nombre === SECUENCIAS.VENTAS) {
    return ventas.reduce((maximo, venta) => {
      const coincidencia = String(venta.codigo || "").match(/(\d+)$/);
      return Math.max(maximo, coincidencia ? Number(coincidencia[1]) : 0);
    }, 0);
  }
  return ventas.reduce((maximo, venta) => {
    const coincidencia = String(venta.numeroFactura || "").match(/(\d+)$/);
    return Math.max(maximo, coincidencia ? Number(coincidencia[1]) : 0);
  }, 0);
}

export async function restaurarRespaldo(archivo, { reemplazar = true } = {}) {
  if (!db) throw new Error("La base de datos no está disponible.");
  if (!archivo) throw new Error("Selecciona un archivo ZIP de respaldo.");
  const zip = await JSZip.loadAsync(await archivo.arrayBuffer());
  const datos = await cargarDatosDesdeZip(zip);

  if (!datos.productos.length && !datos.ventas.length) {
    throw new Error("El respaldo no contiene productos ni ventas para restaurar.");
  }

  const ahora = new Date().toISOString();
  await db.transaction(
    "rw",
    db.productos,
    db.ventas,
    db.ajustes,
    db.secuencias,
    db.movimientos,
    async () => {
      if (reemplazar) {
        await Promise.all([
          db.productos.clear(),
          db.ventas.clear(),
          db.ajustes.clear(),
          db.secuencias.clear(),
          db.movimientos.clear(),
        ]);
      }

      if (datos.productos.length) await db.productos.bulkPut(datos.productos);
      if (datos.ventas.length) await db.ventas.bulkPut(datos.ventas);
      if (datos.movimientos.length) await db.movimientos.bulkPut(datos.movimientos);

      const ajustes = Object.entries(datos.ajustes || {}).map(([clave, valor]) => ({
        clave,
        valor,
      }));
      if (ajustes.length) await db.ajustes.bulkPut(ajustes);

      const secuenciasGuardadas = new Map(
        (datos.secuencias || []).map((secuencia) => [secuencia.nombre, secuencia.valor])
      );
      for (const nombre of Object.values(SECUENCIAS)) {
        const calculada = maximaSecuenciaDesdeDatos(
          datos.productos,
          datos.ventas,
          nombre
        );
        const guardada = Number(secuenciasGuardadas.get(nombre) || 0);
        await db.secuencias.put({
          nombre,
          valor: Math.max(guardada, calculada),
        });
      }

      if (!datos.ajustes || !datos.ajustes.tema) {
        await db.ajustes.put({ clave: "tema", valor: "claro" });
      }
      await db.ajustes.put({ clave: "ultimaRestauracion", valor: ahora });
    }
  );

  return {
    productos: datos.productos.length,
    ventas: datos.ventas.length,
    movimientos: datos.movimientos.length,
  };
}

export function crearIdentificadorRespaldo() {
  return generarId();
}
