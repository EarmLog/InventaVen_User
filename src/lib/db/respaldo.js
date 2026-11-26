import * as XLSX from "xlsx";
import JSZip from "jszip";
import { db } from "./baseDatos";
import {
  CLAVES_AJUSTES,
  SECUENCIAS,
  NOMBRE_APP,
} from "@/lib/utilidades/constantes";
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

function filasGenericas(registros, campos = []) {
  return registros.map((registro) => {
    const fila = {};
    campos.forEach(({ clave, etiqueta }) => {
      fila[etiqueta] = registro[clave] ?? "";
    });
    fila["Datos JSON"] = JSON.stringify(registro);
    return fila;
  });
}

export async function generarRespaldoZip() {
  if (!db) throw new Error("La base de datos no está disponible.");
  const [
    productos,
    ventas,
    ajustesFilas,
    secuencias,
    movimientos,
    facturasFiscales,
    auditorias,
    operacionesEspeciales,
    proveedores,
    compras,
    cajas,
    clientes,
    deudas,
    abonos,
    imagenesProducto,
  ] = await Promise.all([
    db.productos.toArray(),
    db.ventas.toArray(),
    db.ajustes.toArray(),
    db.secuencias.toArray(),
    db.movimientos.toArray(),
    db.facturasFiscales.toArray(),
    db.auditorias.toArray(),
    db.operacionesEspeciales.toArray(),
    db.proveedores.toArray(),
    db.compras.toArray(),
    db.cajas.toArray(),
    db.clientes.toArray(),
    db.deudas.toArray(),
    db.abonos.toArray(),
    db.imagenesProducto.toArray(),
  ]);
  const ajustes = ajustesFilas.reduce((acumulado, fila) => {
    acumulado[fila.clave] = fila.valor;
    return acumulado;
  }, {});

  const datos = {
    app: NOMBRE_APP,
    version: 2,
    exportadoEn: new Date().toISOString(),
    productos,
    ventas,
    ajustes,
    secuencias,
    movimientos,
    facturasFiscales,
    auditorias,
    operacionesEspeciales,
    proveedores,
    compras,
    cajas,
    clientes,
    deudas,
    abonos,
    imagenesProducto,
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
    Movimientos: libroConHojas({
      Movimientos: crearHoja(
        filasGenericas(movimientos, [
          { clave: "id", etiqueta: "ID" },
          { clave: "productoId", etiqueta: "Producto ID" },
          { clave: "varianteId", etiqueta: "Variante ID" },
          { clave: "tipo", etiqueta: "Tipo" },
          { clave: "cantidad", etiqueta: "Cantidad" },
          { clave: "fecha", etiqueta: "Fecha" },
        ]),
        ["ID", "Producto ID", "Variante ID", "Tipo", "Cantidad", "Fecha", "Datos JSON"]
      ),
    }),
    Proveedores: libroConHojas({
      Proveedores: crearHoja(
        filasGenericas(proveedores, [
          { clave: "id", etiqueta: "ID" },
          { clave: "nombre", etiqueta: "Nombre" },
          { clave: "rif", etiqueta: "RIF" },
          { clave: "telefono", etiqueta: "Teléfono" },
          { clave: "email", etiqueta: "Correo" },
          { clave: "creadoEn", etiqueta: "Creado" },
        ]),
        ["ID", "Nombre", "RIF", "Teléfono", "Correo", "Creado", "Datos JSON"]
      ),
    }),
    Compras: libroConHojas({
      Compras: crearHoja(
        filasGenericas(compras, [
          { clave: "id", etiqueta: "ID" },
          { clave: "fecha", etiqueta: "Fecha" },
          { clave: "tipo", etiqueta: "Tipo" },
          { clave: "estado", etiqueta: "Estado" },
          { clave: "productoNombre", etiqueta: "Producto" },
          { clave: "totalUsd", etiqueta: "Total USD" },
          { clave: "totalVes", etiqueta: "Total VES" },
        ]),
        [
          "ID",
          "Fecha",
          "Tipo",
          "Estado",
          "Producto",
          "Total USD",
          "Total VES",
          "Datos JSON",
        ]
      ),
    }),
    Cajas: libroConHojas({
      Cajas: crearHoja(
        filasGenericas(cajas, [
          { clave: "id", etiqueta: "ID" },
          { clave: "nombre", etiqueta: "Nombre" },
          { clave: "codigo", etiqueta: "Código" },
          { clave: "estado", etiqueta: "Estado" },
          { clave: "fechaCreacion", etiqueta: "Creada" },
          { clave: "fechaCierre", etiqueta: "Cerrada" },
        ]),
        ["ID", "Nombre", "Código", "Estado", "Creada", "Cerrada", "Datos JSON"]
      ),
    }),
    Deudores: libroConHojas({
      Clientes: crearHoja(
        filasGenericas(clientes, [
          { clave: "id", etiqueta: "ID" },
          { clave: "nombre", etiqueta: "Nombre" },
          { clave: "telefono", etiqueta: "Teléfono" },
          { clave: "documento", etiqueta: "Documento" },
          { clave: "direccion", etiqueta: "Dirección" },
          { clave: "notas", etiqueta: "Notas" },
        ]),
        ["ID", "Nombre", "Teléfono", "Documento", "Dirección", "Notas", "Datos JSON"]
      ),
      Deudas: crearHoja(
        filasGenericas(deudas, [
          { clave: "id", etiqueta: "ID" },
          { clave: "codigo", etiqueta: "Código" },
          { clave: "clienteId", etiqueta: "Cliente ID" },
          { clave: "ventaId", etiqueta: "Venta ID" },
          { clave: "origen", etiqueta: "Origen" },
          { clave: "estado", etiqueta: "Estado" },
          { clave: "capitalUsd", etiqueta: "Capital USD" },
          { clave: "saldoUsd", etiqueta: "Saldo USD" },
          { clave: "saldoVes", etiqueta: "Saldo VES" },
          { clave: "comisionCasheaUsd", etiqueta: "Comisión Cashea USD" },
        ]),
        [
          "ID",
          "Código",
          "Cliente ID",
          "Venta ID",
          "Origen",
          "Estado",
          "Capital USD",
          "Saldo USD",
          "Saldo VES",
          "Comisión Cashea USD",
          "Datos JSON",
        ]
      ),
      Abonos: crearHoja(
        filasGenericas(abonos, [
          { clave: "id", etiqueta: "ID" },
          { clave: "deudaId", etiqueta: "Deuda ID" },
          { clave: "clienteId", etiqueta: "Cliente ID" },
          { clave: "montoUsd", etiqueta: "Monto USD" },
          { clave: "montoVes", etiqueta: "Monto VES" },
          { clave: "metodoPago", etiqueta: "Método de pago" },
          { clave: "fecha", etiqueta: "Fecha" },
        ]),
        [
          "ID",
          "Deuda ID",
          "Cliente ID",
          "Monto USD",
          "Monto VES",
          "Método de pago",
          "Fecha",
          "Datos JSON",
        ]
      ),
      Fotos: crearHoja(
        filasGenericas(imagenesProducto, [
          { clave: "id", etiqueta: "ID" },
          { clave: "productoId", etiqueta: "Producto ID" },
          { clave: "mime", etiqueta: "Formato" },
          { clave: "ancho", etiqueta: "Ancho" },
          { clave: "alto", etiqueta: "Alto" },
        ]),
        ["ID", "Producto ID", "Formato", "Ancho", "Alto", "Datos JSON"]
      ),
    }),
    Fiscal: libroConHojas({
      Facturas: crearHoja(
        filasGenericas(facturasFiscales, [
          { clave: "id", etiqueta: "ID" },
          { clave: "ventaId", etiqueta: "Venta ID" },
          { clave: "tipo", etiqueta: "Tipo" },
          { clave: "estado", etiqueta: "Estado" },
          { clave: "fecha", etiqueta: "Fecha" },
          { clave: "totalUsd", etiqueta: "Total USD" },
        ]),
        ["ID", "Venta ID", "Tipo", "Estado", "Fecha", "Total USD", "Datos JSON"]
      ),
    }),
    Auditoria: libroConHojas({
      Auditorias: crearHoja(
        filasGenericas(auditorias, [
          { clave: "id", etiqueta: "ID" },
          { clave: "usuarioId", etiqueta: "Usuario ID" },
          { clave: "accion", etiqueta: "Acción" },
          { clave: "entidad", etiqueta: "Entidad" },
          { clave: "entidadId", etiqueta: "Entidad ID" },
          { clave: "fecha", etiqueta: "Fecha" },
        ]),
        [
          "ID",
          "Usuario ID",
          "Acción",
          "Entidad",
          "Entidad ID",
          "Fecha",
          "Datos JSON",
        ]
      ),
      "Operaciones especiales": crearHoja(
        filasGenericas(operacionesEspeciales, [
          { clave: "id", etiqueta: "ID" },
          { clave: "tipo", etiqueta: "Tipo" },
          { clave: "entidadId", etiqueta: "Entidad ID" },
          { clave: "entidadTipo", etiqueta: "Entidad tipo" },
          { clave: "fecha", etiqueta: "Fecha" },
          { clave: "estado", etiqueta: "Estado" },
        ]),
        [
          "ID",
          "Tipo",
          "Entidad ID",
          "Entidad tipo",
          "Fecha",
          "Estado",
          "Datos JSON",
        ]
      ),
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
      "- Configuracion.xlsx: ajustes, correlativos y movimientos.",
      "- Proveedores.xlsx, Compras.xlsx y Cajas.xlsx.",
      "- Deudores.xlsx: clientes, deudas, abonos y fotos de productos.",
      "- Fiscal.xlsx: facturas fiscales.",
      "- Auditoria.xlsx: auditorías y operaciones especiales.",
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
    const arreglo = (valor) => (Array.isArray(valor) ? valor : []);
    return {
      productos: arreglo(datos.productos),
      ventas: arreglo(datos.ventas),
      ajustes: datos.ajustes && typeof datos.ajustes === "object" ? datos.ajustes : {},
      secuencias: arreglo(datos.secuencias),
      movimientos: arreglo(datos.movimientos),
      facturasFiscales: arreglo(datos.facturasFiscales),
      auditorias: arreglo(datos.auditorias),
      operacionesEspeciales: arreglo(datos.operacionesEspeciales),
      proveedores: arreglo(datos.proveedores),
      compras: arreglo(datos.compras),
      cajas: arreglo(datos.cajas),
      clientes: arreglo(datos.clientes),
      deudas: arreglo(datos.deudas),
      abonos: arreglo(datos.abonos),
      imagenesProducto: arreglo(datos.imagenesProducto),
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
    facturasFiscales: [],
    auditorias: [],
    operacionesEspeciales: [],
    proveedores: [],
    compras: [],
    cajas: [],
    clientes: [],
    deudas: [],
    abonos: [],
    imagenesProducto: [],
  };
}

function maximaSecuenciaDesdeDatos(productos, ventas, nombre, deudas = []) {
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
  if (nombre === SECUENCIAS.DEUDAS) {
    return deudas.reduce((maximo, deuda) => {
      const coincidencia = String(deuda.codigo || "").match(/(\d+)$/);
      return Math.max(maximo, coincidencia ? Number(coincidencia[1]) : 0);
    }, 0);
  }
  return ventas.reduce((maximo, venta) => {
    const coincidencia = String(venta.numeroFactura || "").match(/(\d+)$/);
    return Math.max(maximo, coincidencia ? Number(coincidencia[1]) : 0);
  }, 0);
}

const AJUSTES_OPERATIVOS_PRESERVADOS = [
  CLAVES_AJUSTES.COPIA_NUBE_ACTIVA,
  CLAVES_AJUSTES.COPIA_NUBE_ULTIMA,
  CLAVES_AJUSTES.COPIA_NUBE_ULTIMA_FECHA,
  CLAVES_AJUSTES.COPIA_NUBE_ULTIMO_ERROR,
  CLAVES_AJUSTES.COPIA_NUBE_EN_CURSO,
  CLAVES_AJUSTES.GOOGLE_DRIVE_ACTIVO,
  CLAVES_AJUSTES.GOOGLE_DRIVE_CUENTA,
  CLAVES_AJUSTES.GOOGLE_DRIVE_ULTIMA,
  CLAVES_AJUSTES.TASA_USD,
  CLAVES_AJUSTES.TASA_ACTUALIZADA_EN,
  CLAVES_AJUSTES.TASA_ULTIMA_APLICADA,
  CLAVES_AJUSTES.TASA_MANUAL,
  CLAVES_AJUSTES.NOMBRE_NEGOCIO,
  CLAVES_AJUSTES.RIF_NEGOCIO,
  CLAVES_AJUSTES.ONBOARDING_VISTO,
  CLAVES_AJUSTES.METODO_DEUDA_ACTIVO,
  CLAVES_AJUSTES.ACTUALIZAR_SALDOS_DEUDOR_DOLAR,
  CLAVES_AJUSTES.COMISION_CASHEA,
  CLAVES_AJUSTES.TIENDA_SLUG,
  CLAVES_AJUSTES.TIENDA_TOKEN,
  CLAVES_AJUSTES.TIENDA_ACTIVA,
  CLAVES_AJUSTES.TIENDA_TELEFONO,
  CLAVES_AJUSTES.TIENDA_PUBLICADA_EN,
];

export async function restaurarRespaldo(archivo, { reemplazar = true } = {}) {
  if (!db) throw new Error("La base de datos no está disponible.");
  if (!archivo) throw new Error("Selecciona un archivo ZIP de respaldo.");
  const zip = await JSZip.loadAsync(await archivo.arrayBuffer());
  const datos = await cargarDatosDesdeZip(zip);

  const totalRegistros = [
    datos.productos,
    datos.ventas,
    datos.movimientos,
    datos.facturasFiscales,
    datos.auditorias,
    datos.operacionesEspeciales,
    datos.proveedores,
    datos.compras,
    datos.cajas,
    datos.clientes,
    datos.deudas,
    datos.abonos,
    datos.imagenesProducto,
  ].reduce((total, lista) => total + lista.length, 0);

  if (totalRegistros === 0 && Object.keys(datos.ajustes || {}).length === 0) {
    throw new Error("El respaldo no contiene datos para restaurar.");
  }

  const ahora = new Date().toISOString();
  const ajustesPreservados = reemplazar
    ? (await db.ajustes.bulkGet(AJUSTES_OPERATIVOS_PRESERVADOS)).filter(Boolean)
    : [];

  await db.transaction(
    "rw",
    db.productos,
    db.ventas,
    db.ajustes,
    db.secuencias,
    db.movimientos,
    db.facturasFiscales,
    db.auditorias,
    db.operacionesEspeciales,
    db.proveedores,
    db.compras,
    db.cajas,
    db.clientes,
    db.deudas,
    db.abonos,
    db.imagenesProducto,
    async () => {
      if (reemplazar) {
        await Promise.all([
          db.productos.clear(),
          db.ventas.clear(),
          db.ajustes.clear(),
          db.secuencias.clear(),
          db.movimientos.clear(),
          db.facturasFiscales.clear(),
          db.auditorias.clear(),
          db.operacionesEspeciales.clear(),
          db.proveedores.clear(),
          db.compras.clear(),
          db.cajas.clear(),
          db.clientes.clear(),
          db.deudas.clear(),
          db.abonos.clear(),
          db.imagenesProducto.clear(),
        ]);
      }

      if (datos.productos.length) await db.productos.bulkPut(datos.productos);
      if (datos.ventas.length) await db.ventas.bulkPut(datos.ventas);
      if (datos.movimientos.length) await db.movimientos.bulkPut(datos.movimientos);
      if (datos.facturasFiscales.length) {
        await db.facturasFiscales.bulkPut(datos.facturasFiscales);
      }
      if (datos.auditorias.length) await db.auditorias.bulkPut(datos.auditorias);
      if (datos.operacionesEspeciales.length) {
        await db.operacionesEspeciales.bulkPut(datos.operacionesEspeciales);
      }
      if (datos.proveedores.length) await db.proveedores.bulkPut(datos.proveedores);
      if (datos.compras.length) await db.compras.bulkPut(datos.compras);
      if (datos.cajas.length) await db.cajas.bulkPut(datos.cajas);
      if (datos.clientes.length) await db.clientes.bulkPut(datos.clientes);
      if (datos.deudas.length) await db.deudas.bulkPut(datos.deudas);
      if (datos.abonos.length) await db.abonos.bulkPut(datos.abonos);
      if (datos.imagenesProducto.length) {
        await db.imagenesProducto.bulkPut(datos.imagenesProducto);
      }

      const ajustes = Object.entries(datos.ajustes || {}).map(([clave, valor]) => ({
        clave,
        valor,
      }));
      if (ajustes.length) await db.ajustes.bulkPut(ajustes);

      if (ajustesPreservados.length) {
        await db.ajustes.bulkPut(ajustesPreservados);
      }

      const secuenciasGuardadas = new Map(
        (datos.secuencias || []).map((secuencia) => [secuencia.nombre, secuencia.valor])
      );
      for (const nombre of Object.values(SECUENCIAS)) {
        const calculada = maximaSecuenciaDesdeDatos(
          datos.productos,
          datos.ventas,
          nombre,
          datos.deudas
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
    facturasFiscales: datos.facturasFiscales.length,
    auditorias: datos.auditorias.length,
    operacionesEspeciales: datos.operacionesEspeciales.length,
    proveedores: datos.proveedores.length,
    compras: datos.compras.length,
    cajas: datos.cajas.length,
    clientes: datos.clientes.length,
    deudas: datos.deudas.length,
    abonos: datos.abonos.length,
    imagenesProducto: datos.imagenesProducto.length,
  };
}

export function crearIdentificadorRespaldo() {
  return generarId();
}
