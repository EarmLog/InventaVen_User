const formatoUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoVes = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-VE", {
  maximumFractionDigits: 3,
});

export function formatearUsd(valor) {
  return formatoUsd.format(Number(valor) || 0);
}

export function formatearVes(valor) {
  return `Bs. ${formatoVes.format(Number(valor) || 0)}`;
}

export function formatearNumero(valor) {
  return formatoNumero.format(Number(valor) || 0);
}

export function formatearPorcentaje(valor) {
  return `${formatoNumero.format(Number(valor) || 0)}%`;
}

export function formatearFecha(fecha, opciones = {}) {
  if (!fecha) return "—";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opciones,
  }).format(valor);
}

export function formatearFechaHora(fecha) {
  return formatearFecha(fecha, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatearFechaLarga(fecha) {
  return formatearFecha(fecha, { weekday: "long" });
}

export function fechaParaInput(fecha = new Date()) {
  const valor = new Date(fecha);
  const anio = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, "0");
  const dia = String(valor.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function hoyParaInput() {
  return fechaParaInput(new Date());
}

export function inicioDelDia(fecha) {
  const valor = new Date(fecha);
  valor.setHours(0, 0, 0, 0);
  return valor;
}

export function inicioDeSemana(fecha) {
  const valor = inicioDelDia(fecha);
  const dia = valor.getDay();
  const diferencia = dia === 0 ? -6 : 1 - dia;
  valor.setDate(valor.getDate() + diferencia);
  return valor;
}

export function inicioDeMes(fecha) {
  const valor = new Date(fecha);
  return new Date(valor.getFullYear(), valor.getMonth(), 1);
}

export function finDeMes(fecha) {
  const valor = new Date(fecha);
  return new Date(valor.getFullYear(), valor.getMonth() + 1, 0);
}

export function finDelDia(fecha) {
  const valor = new Date(fecha);
  valor.setHours(23, 59, 59, 999);
  return valor;
}

export function redondear(valor, decimales = 2) {
  const numero = Number(valor) || 0;
  const factor = 10 ** decimales;
  return Math.round((numero + Number.EPSILON) * factor) / factor;
}

export function calcularDiasRestantes(fechaVencimiento) {
  if (!fechaVencimiento) return 0;
  const fin = new Date(fechaVencimiento).getTime();
  if (Number.isNaN(fin)) return 0;
  return Math.ceil((fin - Date.now()) / 86_400_000);
}

export function sumarDias(fecha, dias) {
  const valor = new Date(fecha);
  valor.setDate(valor.getDate() + Number(dias || 0));
  return valor;
}

export function limpiarTexto(valor, maximo = 200) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim().slice(0, maximo);
}

export function limpiarNumero(valor, defecto = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : defecto;
}

export function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizarTextoSku(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

export function capitalizar(texto) {
  const cadena = String(texto || "").trim();
  if (!cadena) return "";
  return cadena.charAt(0).toUpperCase() + cadena.slice(1);
}

export function minutosDesde(fecha) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 60_000);
}

function fechaLocal(valor) {
  if (!valor) return null;
  const fecha =
    valor instanceof Date
      ? new Date(valor)
      : new Date(`${String(valor).slice(0, 10)}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function limitesDeRango(desde, hasta) {
  const inicio = fechaLocal(desde);
  const fin = fechaLocal(hasta);
  if (!inicio || !fin) return null;
  if (inicio > fin) {
    return { inicio: inicioDelDia(fin), fin: finDelDia(inicio), invertido: true };
  }
  return { inicio: inicioDelDia(inicio), fin: finDelDia(fin), invertido: false };
}

export function ventasEnRango(ventas, desde, hasta) {
  const limites = limitesDeRango(desde, hasta);
  if (!limites) return [];
  return ventas.filter((venta) => {
    if (venta.estado === "reportada" || venta.estado === "cancelada") return false;
    const fecha = new Date(venta.fecha);
    return fecha >= limites.inicio && fecha <= limites.fin;
  });
}

export function agruparVentasPorRango(ventas, desde, hasta) {
  const limites = limitesDeRango(desde, hasta);
  if (!limites) return [];
  const resultado = [];
  const cursor = new Date(limites.inicio);
  let seguridad = 0;

  while (cursor <= limites.fin && seguridad < 800) {
    const clave = fechaParaInput(cursor);
    const ventasDia = ventas.filter(
      (venta) =>
        venta.estado !== "cancelada" &&
        venta.estado !== "reportada" &&
        fechaParaInput(venta.fecha) === clave
    );
    resultado.push({
      fecha: clave,
      etiqueta: new Intl.DateTimeFormat("es-VE", {
        day: "2-digit",
        month: "short",
      }).format(cursor),
      totalUsd: redondear(
        ventasDia.reduce((total, venta) => total + Number(venta.totalUsd || 0), 0)
      ),
      totalVes: redondear(
        ventasDia.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
      ),
      cantidad: ventasDia.length,
    });
    cursor.setDate(cursor.getDate() + 1);
    seguridad += 1;
  }

  return resultado;
}
