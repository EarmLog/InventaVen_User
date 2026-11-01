import Dexie from "dexie";
import { NOMBRE_BASE_DATOS, CLAVES_AJUSTES, SECUENCIAS } from "@/lib/utilidades/constantes";

class BaseDatosInventaVen extends Dexie {
  constructor() {
    super(NOMBRE_BASE_DATOS);
    this.version(1).stores({
      productos:
        "id, sku, nombre, categoria, activo, creadoEn, actualizadoEn, fechaRenovacion",
      ventas: "id, codigo, numeroFactura, fecha, estado, tipoPago, creadoEn",
      ajustes: "clave",
      secuencias: "nombre",
      movimientos: "id, productoId, varianteId, tipo, fecha",
    });
  }
}

export const db = typeof window !== "undefined" ? new BaseDatosInventaVen() : null;

export function obtenerDb() {
  if (!db) {
    throw new Error("La base de datos local solo está disponible en el navegador.");
  }
  return db;
}

export async function asegurarDatosIniciales() {
  if (!db) return;
  const ajustesIniciales = [
    { clave: CLAVES_AJUSTES.TEMA, valor: "claro" },
    { clave: CLAVES_AJUSTES.ACTUALIZAR_PRECIOS_AUTO, valor: false },
    { clave: CLAVES_AJUSTES.TASA_USD, valor: 0 },
    { clave: CLAVES_AJUSTES.TASA_ACTUALIZADA_EN, valor: null },
    { clave: CLAVES_AJUSTES.ULTIMA_ACTUALIZACION_PRECIOS, valor: null },
  ];
  const secuenciasIniciales = [
    { nombre: SECUENCIAS.PRODUCTOS, valor: 0 },
    { nombre: SECUENCIAS.VENTAS, valor: 0 },
    { nombre: SECUENCIAS.FACTURAS, valor: 0 },
  ];
  await db.transaction("rw", db.ajustes, db.secuencias, async () => {
    for (const ajuste of ajustesIniciales) {
      const existente = await db.ajustes.get(ajuste.clave);
      if (!existente) await db.ajustes.put(ajuste);
    }
    for (const secuencia of secuenciasIniciales) {
      const existente = await db.secuencias.get(secuencia.nombre);
      if (!existente) await db.secuencias.put(secuencia);
    }
  });
}
