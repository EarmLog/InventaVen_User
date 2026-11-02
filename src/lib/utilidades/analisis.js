import {
  fechaParaInput,
  formatearFecha,
  inicioDeMes,
  inicioDeSemana,
  inicioDelDia,
  limitesDeRango,
  redondear,
  sumarDias,
} from "./formato";

const DIA_MS = 86_400_000;

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DIAS_SEMANA_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function tasaDeVenta(venta) {
  const tasa = Number(venta?.tasaUsd) || 0;
  if (tasa > 0) return tasa;
  const totalUsd = Number(venta?.totalUsd) || 0;
  const totalVes = Number(venta?.totalVes) || 0;
  return totalUsd > 0 ? totalVes / totalUsd : 0;
}

export function costoDeItem(item) {
  const costoTotal = Number(item?.costoTotalUsd);
  if (Number.isFinite(costoTotal) && costoTotal > 0) return costoTotal;
  return (Number(item?.costoUnitarioUsd) || 0) * (Number(item?.cantidad) || 0);
}

export function obtenerPeriodoAnterior(desde, hasta) {
  const limites = limitesDeRango(desde, hasta);
  if (!limites) return null;
  const inicio = inicioDelDia(limites.inicio);
  const fin = inicioDelDia(limites.fin);
  const dias = Math.max(1, Math.round((fin - inicio) / DIA_MS) + 1);
  const finAnterior = sumarDias(inicio, -1);
  const inicioAnterior = sumarDias(finAnterior, -(dias - 1));
  return {
    desde: fechaParaInput(inicioAnterior),
    hasta: fechaParaInput(finAnterior),
    dias,
  };
}

export function granularidadAutomatica(desde, hasta) {
  const limites = limitesDeRango(desde, hasta);
  if (!limites) return "dia";
  const inicio = inicioDelDia(limites.inicio);
  const fin = inicioDelDia(limites.fin);
  const dias = Math.round((fin - inicio) / DIA_MS) + 1;
  if (dias <= 31) return "dia";
  if (dias <= 120) return "semana";
  return "mes";
}

function redondearTotales(totales) {
  return {
    ...totales,
    totalUsd: redondear(totales.totalUsd),
    totalVes: redondear(totales.totalVes),
    baseUsd: redondear(totales.baseUsd),
    baseVes: redondear(totales.baseVes),
    costoUsd: redondear(totales.costoUsd),
    costoVes: redondear(totales.costoVes),
    gananciaUsd: redondear(totales.gananciaUsd),
    gananciaVes: redondear(totales.gananciaVes),
    descuentoUsd: redondear(totales.descuentoUsd),
    descuentoVes: redondear(totales.descuentoVes),
    ivaUsd: redondear(totales.ivaUsd),
    ivaVes: redondear(totales.ivaVes),
    unidades: redondear(totales.unidades, 3),
    margenUsd: redondear(totales.margenUsd, 1),
    margenVes: redondear(totales.margenVes, 1),
    ticketUsd: redondear(totales.ticketUsd),
    ticketVes: redondear(totales.ticketVes),
  };
}

export function calcularTotales(ventas = []) {
  const totales = {
    facturas: ventas.length,
    totalUsd: 0,
    totalVes: 0,
    baseUsd: 0,
    baseVes: 0,
    costoUsd: 0,
    costoVes: 0,
    gananciaUsd: 0,
    gananciaVes: 0,
    descuentoUsd: 0,
    descuentoVes: 0,
    ivaUsd: 0,
    ivaVes: 0,
    unidades: 0,
    margenUsd: 0,
    margenVes: 0,
    ticketUsd: 0,
    ticketVes: 0,
  };

  ventas.forEach((venta) => {
    const tasa = tasaDeVenta(venta);
    const totalUsd = Number(venta.totalUsd) || 0;
    const totalVes = Number(venta.totalVes) || 0;
    const baseUsd = Number(venta.baseUsd) || 0;
    const baseVes = Number(venta.baseVes) || 0;
    const costoGuardado = Number(venta.costoTotalUsd);
    const costoUsd = Number.isFinite(costoGuardado)
      ? costoGuardado
      : (venta.items || []).reduce((total, item) => total + costoDeItem(item), 0);
    const gananciaGuardada = Number(venta.gananciaUsd);
    const gananciaUsd = Number.isFinite(gananciaGuardada)
      ? gananciaGuardada
      : baseUsd - costoUsd;

    totales.totalUsd += totalUsd;
    totales.totalVes += totalVes;
    totales.baseUsd += baseUsd;
    totales.baseVes += baseVes;
    totales.costoUsd += costoUsd;
    totales.costoVes += costoUsd * tasa;
    totales.gananciaUsd += gananciaUsd;
    totales.gananciaVes += gananciaUsd * tasa;
    totales.descuentoUsd += Number(venta.descuentoUsd) || 0;
    totales.descuentoVes += Number(venta.descuentoVes) || 0;
    totales.ivaUsd += Number(venta.ivaUsd) || 0;
    totales.ivaVes += Number(venta.ivaVes) || 0;
    totales.unidades += (venta.items || []).reduce(
      (total, item) => total + (Number(item.cantidad) || 0),
      0
    );
  });

  totales.margenUsd = totales.baseUsd > 0 ? (totales.gananciaUsd / totales.baseUsd) * 100 : 0;
  totales.margenVes = totales.baseVes > 0 ? (totales.gananciaVes / totales.baseVes) * 100 : 0;
  totales.ticketUsd = totales.facturas > 0 ? totales.totalUsd / totales.facturas : 0;
  totales.ticketVes = totales.facturas > 0 ? totales.totalVes / totales.facturas : 0;

  return redondearTotales(totales);
}

export function calcularVariacion(actual, anterior) {
  const valorActual = Number(actual) || 0;
  const valorAnterior = Number(anterior) || 0;
  if (valorAnterior === 0) {
    return {
      porcentaje: valorActual === 0 ? 0 : null,
      tipo: valorActual === 0 ? "igual" : "sin-base",
      actual: valorActual,
      anterior: valorAnterior,
    };
  }
  const porcentaje = redondear(
    ((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 100,
    1
  );
  return {
    porcentaje,
    tipo: porcentaje > 0 ? "sube" : porcentaje < 0 ? "baja" : "igual",
    actual: valorActual,
    anterior: valorAnterior,
  };
}

function inicioBucket(fecha, granularidad) {
  if (granularidad === "mes") return inicioDeMes(fecha);
  if (granularidad === "semana") return inicioDeSemana(fecha);
  return inicioDelDia(fecha);
}

function siguienteBucket(fecha, granularidad) {
  if (granularidad === "mes") {
    return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
  }
  if (granularidad === "semana") return sumarDias(fecha, 7);
  return sumarDias(fecha, 1);
}

function etiquetaBucket(fecha, granularidad) {
  if (granularidad === "mes") {
    return new Intl.DateTimeFormat("es-VE", {
      month: "short",
      year: "2-digit",
    }).format(fecha);
  }
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
  }).format(fecha);
}

function etiquetaLargaBucket(fecha, granularidad) {
  if (granularidad === "mes") {
    return new Intl.DateTimeFormat("es-VE", {
      month: "long",
      year: "numeric",
    }).format(fecha);
  }
  if (granularidad === "semana") {
    return `Semana del ${new Intl.DateTimeFormat("es-VE", {
      day: "2-digit",
      month: "short",
    }).format(fecha)}`;
  }
  return formatearFecha(fecha);
}

export function agruparVentas(ventas = [], desde, hasta, granularidad = "dia") {
  const limites = limitesDeRango(desde, hasta);
  if (!limites) return [];

  const mapa = new Map();
  let cursor = inicioBucket(limites.inicio, granularidad);
  let seguridad = 0;

  while (cursor <= limites.fin && seguridad < 2000) {
    const clave = fechaParaInput(cursor);
    mapa.set(clave, {
      clave,
      fecha: clave,
      etiqueta: etiquetaBucket(cursor, granularidad),
      etiquetaLarga: etiquetaLargaBucket(cursor, granularidad),
      totalUsd: 0,
      totalVes: 0,
      baseUsd: 0,
      baseVes: 0,
      costoUsd: 0,
      costoVes: 0,
      gananciaUsd: 0,
      gananciaVes: 0,
      descuentoUsd: 0,
      descuentoVes: 0,
      ivaUsd: 0,
      ivaVes: 0,
      cantidad: 0,
      unidades: 0,
      margenUsd: 0,
      margenVes: 0,
    });
    cursor = siguienteBucket(cursor, granularidad);
    seguridad += 1;
  }

  ventas.forEach((venta) => {
    const fecha = new Date(venta.fecha);
    if (Number.isNaN(fecha.getTime())) return;
    const clave = fechaParaInput(inicioBucket(fecha, granularidad));
    const bucket = mapa.get(clave);
    if (!bucket) return;

    const tasa = tasaDeVenta(venta);
    const totalUsd = Number(venta.totalUsd) || 0;
    const totalVes = Number(venta.totalVes) || 0;
    const baseUsd = Number(venta.baseUsd) || 0;
    const baseVes = Number(venta.baseVes) || 0;
    const costoGuardado = Number(venta.costoTotalUsd);
    const costoUsd = Number.isFinite(costoGuardado)
      ? costoGuardado
      : (venta.items || []).reduce((total, item) => total + costoDeItem(item), 0);
    const gananciaGuardada = Number(venta.gananciaUsd);
    const gananciaUsd = Number.isFinite(gananciaGuardada)
      ? gananciaGuardada
      : baseUsd - costoUsd;

    bucket.totalUsd += totalUsd;
    bucket.totalVes += totalVes;
    bucket.baseUsd += baseUsd;
    bucket.baseVes += baseVes;
    bucket.costoUsd += costoUsd;
    bucket.costoVes += costoUsd * tasa;
    bucket.gananciaUsd += gananciaUsd;
    bucket.gananciaVes += gananciaUsd * tasa;
    bucket.descuentoUsd += Number(venta.descuentoUsd) || 0;
    bucket.descuentoVes += Number(venta.descuentoVes) || 0;
    bucket.ivaUsd += Number(venta.ivaUsd) || 0;
    bucket.ivaVes += Number(venta.ivaVes) || 0;
    bucket.cantidad += 1;
    bucket.unidades += (venta.items || []).reduce(
      (total, item) => total + (Number(item.cantidad) || 0),
      0
    );
  });

  return [...mapa.values()].map((bucket) => ({
    ...bucket,
    totalUsd: redondear(bucket.totalUsd),
    totalVes: redondear(bucket.totalVes),
    baseUsd: redondear(bucket.baseUsd),
    baseVes: redondear(bucket.baseVes),
    costoUsd: redondear(bucket.costoUsd),
    costoVes: redondear(bucket.costoVes),
    gananciaUsd: redondear(bucket.gananciaUsd),
    gananciaVes: redondear(bucket.gananciaVes),
    descuentoUsd: redondear(bucket.descuentoUsd),
    descuentoVes: redondear(bucket.descuentoVes),
    ivaUsd: redondear(bucket.ivaUsd),
    ivaVes: redondear(bucket.ivaVes),
    unidades: redondear(bucket.unidades, 3),
    margenUsd:
      bucket.baseUsd > 0 ? redondear((bucket.gananciaUsd / bucket.baseUsd) * 100, 1) : 0,
    margenVes:
      bucket.baseVes > 0 ? redondear((bucket.gananciaVes / bucket.baseVes) * 100, 1) : 0,
  }));
}

export function construirComparacion(actual = [], anterior = []) {
  const total = Math.max(actual.length, anterior.length);
  return Array.from({ length: total }, (_, indice) => {
    const registroActual = actual[indice];
    const registroAnterior = anterior[indice];
    return {
      etiqueta: registroActual?.etiqueta || registroAnterior?.etiqueta || `#${indice + 1}`,
      etiquetaLarga: registroActual?.etiquetaLarga || registroAnterior?.etiquetaLarga || "",
      etiquetaAnterior: registroAnterior?.etiquetaLarga || "",
      actualUsd: registroActual?.totalUsd || 0,
      anteriorUsd: registroAnterior?.totalUsd || 0,
      actualVes: registroActual?.totalVes || 0,
      anteriorVes: registroAnterior?.totalVes || 0,
    };
  });
}

export function agruparPorCategoria(ventas = [], productos = []) {
  const categoriaPorProducto = new Map(
    (productos || []).map((producto) => [producto.id, producto.categoria])
  );
  const mapa = new Map();

  ventas.forEach((venta) => {
    const tasa = tasaDeVenta(venta);
    (venta.items || []).forEach((item) => {
      const categoria =
        item.categoria || categoriaPorProducto.get(item.productoId) || "Sin categoría";
      const actual = mapa.get(categoria) || {
        nombre: categoria,
        totalUsd: 0,
        totalVes: 0,
        gananciaUsd: 0,
        gananciaVes: 0,
        unidades: 0,
        facturas: new Set(),
      };
      const totalUsd = Number(item.totalLineaUsd) || 0;
      const totalVes = Number(item.totalLineaVes) || 0;
      const gananciaUsd = totalUsd - costoDeItem(item);

      actual.totalUsd += totalUsd;
      actual.totalVes += totalVes;
      actual.gananciaUsd += gananciaUsd;
      actual.gananciaVes += gananciaUsd * tasa;
      actual.unidades += Number(item.cantidad) || 0;
      actual.facturas.add(venta.id);
      mapa.set(categoria, actual);
    });
  });

  return [...mapa.values()]
    .map((categoria) => ({
      nombre: categoria.nombre,
      totalUsd: redondear(categoria.totalUsd),
      totalVes: redondear(categoria.totalVes),
      gananciaUsd: redondear(categoria.gananciaUsd),
      gananciaVes: redondear(categoria.gananciaVes),
      unidades: redondear(categoria.unidades, 3),
      facturas: categoria.facturas.size,
      margenUsd:
        categoria.totalUsd > 0
          ? redondear((categoria.gananciaUsd / categoria.totalUsd) * 100, 1)
          : 0,
      margenVes:
        categoria.totalVes > 0
          ? redondear((categoria.gananciaVes / categoria.totalVes) * 100, 1)
          : 0,
    }))
    .sort((a, b) => b.totalVes - a.totalVes);
}

export function rankingProductos(ventas = [], criterio = "unidades", moneda = "VES") {
  const mapa = new Map();

  ventas.forEach((venta) => {
    const tasa = tasaDeVenta(venta);
    (venta.items || []).forEach((item) => {
      const clave = item.sku || item.nombre;
      const actual = mapa.get(clave) || {
        nombre: item.nombre,
        sku: item.sku,
        cantidad: 0,
        totalUsd: 0,
        totalVes: 0,
        costoUsd: 0,
        gananciaUsd: 0,
        gananciaVes: 0,
      };
      const totalUsd = Number(item.totalLineaUsd) || 0;
      const totalVes = Number(item.totalLineaVes) || 0;
      const costoUsd = costoDeItem(item);
      const gananciaUsd = totalUsd - costoUsd;

      actual.cantidad += Number(item.cantidad) || 0;
      actual.totalUsd += totalUsd;
      actual.totalVes += totalVes;
      actual.costoUsd += costoUsd;
      actual.gananciaUsd += gananciaUsd;
      actual.gananciaVes += gananciaUsd * tasa;
      mapa.set(clave, actual);
    });
  });

  const campo =
    criterio === "ganancia"
      ? moneda === "USD"
        ? "gananciaUsd"
        : "gananciaVes"
      : criterio === "ingresos"
        ? moneda === "USD"
          ? "totalUsd"
          : "totalVes"
        : "cantidad";

  return [...mapa.values()]
    .map((producto) => ({
      ...producto,
      cantidad: redondear(producto.cantidad, 3),
      totalUsd: redondear(producto.totalUsd),
      totalVes: redondear(producto.totalVes),
      costoUsd: redondear(producto.costoUsd),
      gananciaUsd: redondear(producto.gananciaUsd),
      gananciaVes: redondear(producto.gananciaVes),
      margenUsd:
        producto.totalUsd > 0
          ? redondear((producto.gananciaUsd / producto.totalUsd) * 100, 1)
          : 0,
      margenVes:
        producto.totalVes > 0
          ? redondear((producto.gananciaVes / producto.totalVes) * 100, 1)
          : 0,
      valor: redondear(producto[campo], 3),
    }))
    .sort((a, b) => b.valor - a.valor);
}

export function agruparPorHoraDia(ventas = []) {
  const matriz = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({
      totalUsd: 0,
      totalVes: 0,
      cantidad: 0,
    }))
  );

  ventas.forEach((venta) => {
    const fecha = new Date(venta.fecha);
    if (Number.isNaN(fecha.getTime())) return;
    const dia = fecha.getDay();
    const hora = fecha.getHours();
    const celda = matriz[dia][hora];
    celda.totalUsd += Number(venta.totalUsd) || 0;
    celda.totalVes += Number(venta.totalVes) || 0;
    celda.cantidad += 1;
  });

  const celdas = matriz.flat();
  const maxVes = Math.max(0, ...celdas.map((celda) => celda.totalVes));
  const maxUsd = Math.max(0, ...celdas.map((celda) => celda.totalUsd));

  function buscarMejor(campo, maximo) {
    if (maximo <= 0) return null;
    let mejor = { dia: 0, hora: 0, total: 0 };
    matriz.forEach((fila, dia) => {
      fila.forEach((celda, hora) => {
        if (celda[campo] > mejor.total) {
          mejor = { dia, hora, total: celda[campo] };
        }
      });
    });
    return mejor;
  }

  return {
    matriz,
    maxVes,
    maxUsd,
    mejorVes: buscarMejor("totalVes", maxVes),
    mejorUsd: buscarMejor("totalUsd", maxUsd),
  };
}
