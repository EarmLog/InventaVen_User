import { db } from "./baseDatos";
import { obtenerAjustes, guardarAjustes } from "./repositorios";
import {
  fechaLocalClave,
  limpiarRespaldosAntiguos,
  registrarCopiaNubeExitosa,
  registrarErrorCopiaNube,
  subirRespaldoNube,
} from "./respaldoNube";
import { CLAVES_AJUSTES } from "@/lib/utilidades/constantes";

const BLOQUEO_COPIA = "inventaven-copia-nube-en-curso";
const DURACION_BLOQUEO_MS = 15 * 60 * 1000;

function eventoCopia() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("inventaven-copia-nube"));
  }
}

function bloqueoActivo() {
  if (typeof window === "undefined") return false;
  try {
    const valor = Number(window.localStorage.getItem(BLOQUEO_COPIA) || 0);
    return valor > 0 && Date.now() - valor < DURACION_BLOQUEO_MS;
  } catch {
    return false;
  }
}

function activarBloqueo() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOQUEO_COPIA, String(Date.now()));
  } catch {
    // Si el navegador no permite localStorage, la copia sigue funcionando.
  }
}

function liberarBloqueo() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BLOQUEO_COPIA);
  } catch {
    // Sin acción.
  }
}

async function hayDatosParaRespaldar() {
  if (!db) return false;
  const conteos = await Promise.all([
    db.productos.count(),
    db.ventas.count(),
    db.movimientos.count(),
    db.facturasFiscales.count(),
    db.auditorias.count(),
    db.operacionesEspeciales.count(),
    db.proveedores.count(),
    db.compras.count(),
    db.cajas.count(),
    db.clientes.count(),
    db.deudas.count(),
    db.abonos.count(),
    db.imagenesProducto.count(),
  ]);
  return conteos.some((cantidad) => cantidad > 0);
}

export async function ejecutarCopiaAutomatica({ forzar = false } = {}) {
  if (typeof window === "undefined") {
    return { ejecutada: false, motivo: "La copia automática solo funciona en el navegador." };
  }
  if (navigator.onLine === false) {
    return { ejecutada: false, motivo: "Sin conexión." };
  }

  const ajustes = await obtenerAjustes();
  if (!forzar && !Boolean(ajustes[CLAVES_AJUSTES.COPIA_NUBE_ACTIVA])) {
    return { ejecutada: false, motivo: "La copia automática está desactivada." };
  }

  const ultimaFecha = ajustes[CLAVES_AJUSTES.COPIA_NUBE_ULTIMA_FECHA];
  if (
    !forzar &&
    ultimaFecha &&
    fechaLocalClave(new Date(ultimaFecha)) === fechaLocalClave()
  ) {
    return { ejecutada: false, motivo: "Ya se hizo la copia de hoy." };
  }

  if (bloqueoActivo()) {
    return { ejecutada: false, motivo: "Hay una copia en curso." };
  }

  if (!(await hayDatosParaRespaldar())) {
    return { ejecutada: false, motivo: "Todavía no hay datos para respaldar." };
  }

  activarBloqueo();
  try {
    const resultado = await subirRespaldoNube();
    const eliminados = await limpiarRespaldosAntiguos();
    await registrarCopiaNubeExitosa(resultado);
    await guardarAjustes({
      [CLAVES_AJUSTES.COPIA_NUBE_EN_CURSO]: false,
    });
    eventoCopia();
    return { ejecutada: true, ...resultado, eliminados };
  } catch (error) {
    await registrarErrorCopiaNube(error);
    await guardarAjustes({
      [CLAVES_AJUSTES.COPIA_NUBE_EN_CURSO]: false,
    });
    eventoCopia();
    throw error;
  } finally {
    liberarBloqueo();
  }
}
