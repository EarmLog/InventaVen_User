"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Eye,
  FileSpreadsheet,
  FileText,
  Minus,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db/baseDatos";
import { useSesion } from "@/context/SesionContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import FiltroFechas from "@/components/ui/FiltroFechas";
import Selector from "@/components/ui/Selector";
import ModalFactura from "@/components/modules/pos/ModalFactura";
import ModalReportarError from "@/components/modules/analisis/ModalReportarError";
import {
  GraficoCategorias,
  GraficoComparacion,
  GraficoGananciaMargen,
  GraficoPagos,
  GraficoProductos,
  MapaCalorHorarios,
} from "@/components/modules/analisis/Graficos";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import {
  agruparPorCategoria,
  agruparPorHoraDia,
  agruparVentas,
  calcularTotales,
  calcularVariacion,
  construirComparacion,
  granularidadAutomatica,
  obtenerPeriodoAnterior,
  rankingProductos,
} from "@/lib/utilidades/analisis";
import { resumirFacturacion } from "@/lib/utilidades/fiscalidad";
import {
  fechaParaInput,
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  redondear,
  sumarDias,
  ventasEnRango,
} from "@/lib/utilidades/formato";
import {
  exportarAnalisisExcel,
  exportarAnalisisPdf,
} from "@/lib/utilidades/exportar";
import {
  esVentaEnAnalisis,
  etiquetaEstadoVenta,
} from "@/lib/utilidades/ventas";

const MONEDAS_UI = [
  { valor: "VES", etiqueta: "Bs." },
  { valor: "USD", etiqueta: "USD" },
];

const CRITERIOS_PRODUCTOS = [
  { valor: "unidades", etiqueta: "Unidades" },
  { valor: "ingresos", etiqueta: "Ingresos" },
  { valor: "ganancia", etiqueta: "Ganancia" },
];

function formatearMonto(usd, ves, moneda) {
  return moneda === "USD" ? formatearUsd(usd) : formatearVes(ves);
}

function valorMoneda(registro, campo, moneda) {
  return moneda === "USD" ? registro?.[`${campo}Usd`] : registro?.[`${campo}Ves`];
}

function variacionVisual(variacion) {
  if (!variacion) return null;
  if (variacion.tipo === "sin-base") {
    return {
      texto: "Sin base anterior",
      clase: "text-[var(--texto-tenue)]",
      Icono: Minus,
    };
  }
  if (variacion.tipo === "igual") {
    return {
      texto: "Igual que el anterior",
      clase: "text-[var(--texto-tenue)]",
      Icono: Minus,
    };
  }
  const sube = variacion.porcentaje > 0;
  return {
    texto: `${sube ? "+" : ""}${formatearPorcentaje(variacion.porcentaje)} vs anterior`,
    clase: sube ? "text-[var(--primario)]" : "text-[var(--peligro)]",
    Icono: sube ? ArrowUpRight : ArrowDownRight,
  };
}

function Indicador({ Icono, etiqueta, valor, detalle, tono = "verde", variacion = null }) {
  const tonos = {
    verde: "bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
    azul: "bg-[var(--info-suave)] text-[var(--info)]",
    ambar: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
    violeta: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  };
  const visual = variacionVisual(variacion);
  const IconoVariacion = visual?.Icono;
  return (
    <Tarjeta className="flex items-center gap-3 p-4">
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tonos[tono],
        ].join(" ")}
      >
        <Icono className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
          {etiqueta}
        </p>
        <p className="truncate text-lg font-bold tracking-tight">{valor}</p>
        <p className="truncate text-[10px] text-[var(--texto-tenue)]">{detalle}</p>
        {visual ? (
          <p
            className={[
              "mt-1 flex items-center gap-0.5 text-[10px] font-semibold",
              visual.clase,
            ].join(" ")}
          >
            <IconoVariacion className="h-3 w-3" />
            {visual.texto}
          </p>
        ) : null}
      </div>
    </Tarjeta>
  );
}

function varianteEstado(estado) {
  if (estado === "reportada") return "peligro";
  if (estado === "cancelada") return "neutra";
  return "exito";
}

export default function PaginaAnalisis() {
  const { perfil } = useSesion();
  const ventas =
    useLiveQuery(
      () => (db ? db.ventas.orderBy("fecha").reverse().toArray() : []),
      [],
      []
    ) || [];
  const productos =
    useLiveQuery(() => (db ? db.productos.toArray() : []), [], []) || [];
  const [desde, setDesde] = useState(() =>
    fechaParaInput(sumarDias(new Date(), -29))
  );
  const [hasta, setHasta] = useState(() => fechaParaInput(new Date()));
  const [factura, setFactura] = useState(null);
  const [ventaReportar, setVentaReportar] = useState(null);
  const [moneda, setMoneda] = useState("VES");
  const [granularidad, setGranularidad] = useState("auto");
  const [criterioProductos, setCriterioProductos] = useState("unidades");

  const esUsd = moneda === "USD";

  const ventasValidas = useMemo(
    () => ventas.filter(esVentaEnAnalisis),
    [ventas]
  );

  const enRango = useMemo(
    () => ventasEnRango(ventasValidas, desde, hasta),
    [ventasValidas, desde, hasta]
  );

  const periodoAnterior = useMemo(
    () => obtenerPeriodoAnterior(desde, hasta),
    [desde, hasta]
  );

  const ventasAnteriores = useMemo(
    () =>
      periodoAnterior
        ? ventasEnRango(ventasValidas, periodoAnterior.desde, periodoAnterior.hasta)
        : [],
    [ventasValidas, periodoAnterior]
  );

  const totales = useMemo(() => calcularTotales(enRango), [enRango]);
  const totalesAnteriores = useMemo(
    () => calcularTotales(ventasAnteriores),
    [ventasAnteriores]
  );

  const variacionVentas = useMemo(
    () =>
      calcularVariacion(
        valorMoneda(totales, "total", moneda),
        valorMoneda(totalesAnteriores, "total", moneda)
      ),
    [totales, totalesAnteriores, moneda]
  );

  const variacionGanancia = useMemo(
    () =>
      calcularVariacion(
        valorMoneda(totales, "ganancia", moneda),
        valorMoneda(totalesAnteriores, "ganancia", moneda)
      ),
    [totales, totalesAnteriores, moneda]
  );

  const variacionTicket = useMemo(
    () =>
      calcularVariacion(
        valorMoneda(totales, "ticket", moneda),
        valorMoneda(totalesAnteriores, "ticket", moneda)
      ),
    [totales, totalesAnteriores, moneda]
  );

  const variacionUnidades = useMemo(
    () => calcularVariacion(totales.unidades, totalesAnteriores.unidades),
    [totales.unidades, totalesAnteriores.unidades]
  );

  const granularidadEfectiva = useMemo(
    () =>
      granularidad === "auto"
        ? granularidadAutomatica(desde, hasta)
        : granularidad,
    [granularidad, desde, hasta]
  );

  const datosPeriodo = useMemo(
    () => agruparVentas(enRango, desde, hasta, granularidadEfectiva),
    [enRango, desde, hasta, granularidadEfectiva]
  );

  const datosAnteriores = useMemo(
    () =>
      periodoAnterior
        ? agruparVentas(
            ventasAnteriores,
            periodoAnterior.desde,
            periodoAnterior.hasta,
            granularidadEfectiva
          )
        : [],
    [ventasAnteriores, periodoAnterior, granularidadEfectiva]
  );

  const datosComparacion = useMemo(
    () => construirComparacion(datosPeriodo, datosAnteriores),
    [datosPeriodo, datosAnteriores]
  );

  const facturacionFiscal = useMemo(() => resumirFacturacion(enRango), [enRango]);

  const datosPagos = useMemo(() => {
    return TIPOS_PAGO.map((tipo) => {
      const ventasTipo = enRango.filter((venta) => venta.tipoPago === tipo.valor);
      return {
        nombre: tipo.etiqueta,
        totalUsd: redondear(
          ventasTipo.reduce((total, venta) => total + Number(venta.totalUsd || 0), 0)
        ),
        totalVes: redondear(
          ventasTipo.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
        ),
        cantidad: ventasTipo.length,
      };
    }).filter((registro) => registro.totalUsd > 0 || registro.totalVes > 0);
  }, [enRango]);

  const categorias = useMemo(
    () => agruparPorCategoria(enRango, productos),
    [enRango, productos]
  );

  const categoriasGrafico = useMemo(
    () =>
      categorias.slice(0, 8).map((categoria) => ({
        ...categoria,
        nombreCorto:
          categoria.nombre.length > 18
            ? `${categoria.nombre.slice(0, 17)}…`
            : categoria.nombre,
        valor: esUsd ? categoria.totalUsd : categoria.totalVes,
      })),
    [categorias, esUsd]
  );

  const ranking = useMemo(
    () => rankingProductos(enRango, criterioProductos, moneda),
    [enRango, criterioProductos, moneda]
  );

  const topProductos = useMemo(
    () =>
      ranking.slice(0, 8).map((producto) => ({
        ...producto,
        nombreCorto:
          producto.nombre.length > 22
            ? `${producto.nombre.slice(0, 21)}…`
            : producto.nombre,
      })),
    [ranking]
  );

  const resumenHorario = useMemo(() => agruparPorHoraDia(enRango), [enRango]);

  const recientes = ventas.slice(0, 12);
  const desdeVisible = formatearFecha(new Date(`${desde}T12:00:00`));
  const hastaVisible = formatearFecha(new Date(`${hasta}T12:00:00`));
  const periodoAnteriorVisible = periodoAnterior
    ? `${formatearFecha(new Date(`${periodoAnterior.desde}T12:00:00`))} al ${formatearFecha(
        new Date(`${periodoAnterior.hasta}T12:00:00`)
      )}`
    : "Sin período anterior";

  const margen = esUsd ? totales.margenUsd : totales.margenVes;
  const otraMoneda = esUsd ? "VES" : "USD";

  const resumenExportacion = [
    { Indicador: "Período", Valor: `${desdeVisible} al ${hastaVisible}` },
    { Indicador: "Facturas", Valor: enRango.length },
    { Indicador: "Ventas USD", Valor: formatearUsd(totales.totalUsd) },
    { Indicador: "Ventas VES", Valor: formatearVes(totales.totalVes) },
    { Indicador: "Ganancia bruta USD", Valor: formatearUsd(totales.gananciaUsd) },
    { Indicador: "Ganancia bruta VES", Valor: formatearVes(totales.gananciaVes) },
    { Indicador: "Margen USD", Valor: formatearPorcentaje(totales.margenUsd) },
    { Indicador: "Margen VES", Valor: formatearPorcentaje(totales.margenVes) },
    { Indicador: "Ticket promedio USD", Valor: formatearUsd(totales.ticketUsd) },
    { Indicador: "Ticket promedio VES", Valor: formatearVes(totales.ticketVes) },
    { Indicador: "Unidades vendidas", Valor: formatearNumero(totales.unidades) },
    { Indicador: "Descuentos USD", Valor: formatearUsd(totales.descuentoUsd) },
    { Indicador: "Descuentos VES", Valor: formatearVes(totales.descuentoVes) },
    { Indicador: "IVA USD", Valor: formatearUsd(totales.ivaUsd) },
    { Indicador: "IVA VES", Valor: formatearVes(totales.ivaVes) },
  ];

  const facturasExportacion = enRango.map((venta) => {
    const tasa = Number(venta.tasaUsd) || 0;
    const gananciaUsd = Number(venta.gananciaUsd) || 0;
    const baseUsd = Number(venta.baseUsd) || 0;
    return {
      Factura: venta.numeroFactura,
      Fecha: formatearFechaHora(venta.fecha),
      Estado: etiquetaEstadoVenta(venta.estado),
      Pago:
        TIPOS_PAGO.find((tipo) => tipo.valor === venta.tipoPago)?.etiqueta ||
        venta.tipoPago,
      Cliente: venta.clienteNombre || "Consumidor final",
      "Base USD": redondear(baseUsd),
      "Descuento USD": redondear(venta.descuentoUsd),
      "IVA USD": redondear(venta.ivaUsd),
      "Total USD": redondear(venta.totalUsd),
      "Costo USD": redondear(venta.costoTotalUsd),
      "Ganancia USD": redondear(gananciaUsd),
      "Margen %": baseUsd > 0 ? redondear((gananciaUsd / baseUsd) * 100, 1) : 0,
      "Total VES": redondear(venta.totalVes),
      "Ganancia VES": redondear(gananciaUsd * tasa),
    };
  });

  const productosExportacion = ranking.map((producto) => ({
    Producto: producto.nombre,
    SKU: producto.sku,
    Unidades: producto.cantidad,
    "Ingresos USD": producto.totalUsd,
    "Ingresos VES": producto.totalVes,
    "Ganancia USD": producto.gananciaUsd,
    "Ganancia VES": producto.gananciaVes,
    "Margen USD %": producto.margenUsd,
    "Margen VES %": producto.margenVes,
  }));

  const categoriasExportacion = categorias.map((categoria) => ({
    Categoría: categoria.nombre,
    Facturas: categoria.facturas,
    Unidades: categoria.unidades,
    "Ingresos USD": categoria.totalUsd,
    "Ingresos VES": categoria.totalVes,
    "Ganancia USD": categoria.gananciaUsd,
    "Ganancia VES": categoria.gananciaVes,
    "Margen USD %": categoria.margenUsd,
    "Margen VES %": categoria.margenVes,
  }));

  function exportarExcel() {
    try {
      if (!enRango.length) {
        toast.error("No hay ventas en el período para exportar.");
        return;
      }
      exportarAnalisisExcel({
        resumen: resumenExportacion,
        facturas: facturasExportacion,
        productos: productosExportacion,
        categorias: categoriasExportacion,
        nombreArchivo: `analisis-${desde}-a-${hasta}.xlsx`,
      });
      toast.success("Excel generado correctamente.");
    } catch {
      toast.error("No se pudo generar el Excel.");
    }
  }

  function exportarPdf() {
    try {
      if (!enRango.length) {
        toast.error("No hay ventas en el período para exportar.");
        return;
      }
      const columnas = [
        "Producto",
        "SKU",
        "Unidades",
        "Ingresos USD",
        "Ganancia USD",
        "Margen %",
      ];
      const filas = ranking.slice(0, 12).map((producto) => [
        producto.nombre,
        producto.sku,
        formatearNumero(producto.cantidad),
        formatearUsd(producto.totalUsd),
        formatearUsd(producto.gananciaUsd),
        formatearPorcentaje(producto.margenUsd),
      ]);
      exportarAnalisisPdf({
        titulo: "Análisis de ventas",
        subtitulo: `Del ${desdeVisible} al ${hastaVisible}`,
        resumen: resumenExportacion.map((fila) => [fila.Indicador, fila.Valor]),
        columnas,
        filas,
        nombreArchivo: `analisis-${desde}-a-${hasta}.pdf`,
      });
      toast.success("PDF generado correctamente.");
    } catch {
      toast.error("No se pudo generar el PDF.");
    }
  }

  const formatearProducto = (producto) => {
    if (criterioProductos === "unidades") {
      return `${formatearNumero(producto.cantidad)} uds.`;
    }
    if (criterioProductos === "ingresos") {
      return formatearMonto(producto.totalUsd, producto.totalVes, moneda);
    }
    return formatearMonto(producto.gananciaUsd, producto.gananciaVes, moneda);
  };

  const sufijoProductos = criterioProductos === "unidades" ? " uds." : "";
  const monedaProductos = criterioProductos === "unidades" ? null : moneda;
  const nombreProductos =
    criterioProductos === "unidades"
      ? "Unidades"
      : criterioProductos === "ingresos"
        ? "Ingresos"
        : "Ganancia";

  const baseComposicion = esUsd ? totales.baseUsd : totales.baseVes;
  const costoComposicionMoneda = esUsd ? totales.costoUsd : totales.costoVes;
  const gananciaComposicion = esUsd
    ? totales.gananciaUsd
    : totales.gananciaVes;
  const costoBarra =
    baseComposicion > 0
      ? Math.min(100, Math.max(0, (costoComposicionMoneda / baseComposicion) * 100))
      : 0;
  const gananciaBarra =
    baseComposicion > 0
      ? Math.min(100, Math.max(0, (gananciaComposicion / baseComposicion) * 100))
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análisis de ventas</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Del {desdeVisible} al {hastaVisible}. Las ventas reportadas no se incluyen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] p-0.5">
            {MONEDAS_UI.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setMoneda(opcion.valor)}
                className={[
                  "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                  moneda === opcion.valor
                    ? "bg-[var(--superficie)] text-[var(--texto)] shadow-sm"
                    : "text-[var(--texto-suave)] hover:text-[var(--texto)]",
                ].join(" ")}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <Selector
            value={granularidad}
            onChange={(evento) => setGranularidad(evento.target.value)}
            className="h-9 w-auto text-xs"
            aria-label="Agrupar por"
          >
            <option value="auto">Agrupar: Auto</option>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </Selector>
          <Boton
            variante="secundario"
            tamano="sm"
            onClick={exportarExcel}
            disabled={!enRango.length}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Boton>
          <Boton
            variante="secundario"
            tamano="sm"
            onClick={exportarPdf}
            disabled={!enRango.length}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Boton>
          <Etiqueta variante="exito">
            <ReceiptText className="h-3 w-3" />
            {enRango.length} factura{enRango.length === 1 ? "" : "s"}
          </Etiqueta>
        </div>
      </div>

      <FiltroFechas
        desde={desde}
        hasta={hasta}
        onCambiar={({ desde: nuevoDesde, hasta: nuevoHasta }) => {
          setDesde(nuevoDesde);
          setHasta(nuevoHasta);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          Icono={CircleDollarSign}
          etiqueta="Ventas del período"
          valor={formatearMonto(totales.totalUsd, totales.totalVes, moneda)}
          detalle={`${enRango.length} factura${enRango.length === 1 ? "" : "s"} · ${formatearMonto(
            totales.totalUsd,
            totales.totalVes,
            otraMoneda
          )}`}
          variacion={variacionVentas}
        />
        <Indicador
          Icono={TrendingUp}
          etiqueta="Ganancia bruta"
          valor={formatearMonto(
            totales.gananciaUsd,
            totales.gananciaVes,
            moneda
          )}
          detalle={`${formatearPorcentaje(margen)} de margen · antes de gastos`}
          tono="azul"
          variacion={variacionGanancia}
        />
        <Indicador
          Icono={ReceiptText}
          etiqueta="Ticket promedio"
          valor={formatearMonto(
            totales.ticketUsd,
            totales.ticketVes,
            moneda
          )}
          detalle="Por factura emitida"
          tono="violeta"
          variacion={variacionTicket}
        />
        <Indicador
          Icono={ShoppingBag}
          etiqueta="Unidades vendidas"
          valor={formatearNumero(totales.unidades)}
          detalle="Incluye variantes y bultos"
          tono="ambar"
          variacion={variacionUnidades}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Ventas vs período anterior</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Comparado con {periodoAnteriorVisible}.
              </p>
            </div>
            <Etiqueta variante="exito">
              <BarChart3 className="h-3 w-3" />
              {formatearMonto(totales.totalUsd, totales.totalVes, moneda)}
            </Etiqueta>
          </div>
          <GraficoComparacion
            datos={datosComparacion}
            moneda={moneda}
            altura={270}
          />
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-sm font-bold">Métodos de pago</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Distribución de los ingresos del período.
            </p>
          </div>
          <GraficoPagos datos={datosPagos} moneda={moneda} altura={260} />
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Ganancia bruta y margen</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Evolución del margen antes de gastos operativos.
              </p>
            </div>
            <Etiqueta variante="info">
              <TrendingUp className="h-3 w-3" />
              {formatearMonto(totales.gananciaUsd, totales.gananciaVes, moneda)}
            </Etiqueta>
          </div>
          <GraficoGananciaMargen
            datos={datosPeriodo}
            moneda={moneda}
            altura={270}
          />
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-sm font-bold">Ventas por categoría</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Ingresos y margen por categoría en el período.
            </p>
          </div>
          <GraficoCategorias
            datos={categoriasGrafico}
            moneda={moneda}
            altura={260}
          />
          {categorias.length ? (
            <div className="mt-3 space-y-1.5 border-t border-[var(--borde)] pt-3">
              {categorias.slice(0, 4).map((categoria) => (
                <div
                  key={categoria.nombre}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="min-w-0 flex-1 truncate text-[var(--texto-suave)]">
                    {categoria.nombre}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatearMonto(
                      categoria.totalUsd,
                      categoria.totalVes,
                      moneda
                    )}
                  </span>
                  <span className="w-12 shrink-0 text-right text-[10px] text-[var(--texto-tenue)]">
                    {formatearPorcentaje(
                      esUsd ? categoria.margenUsd : categoria.margenVes
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-sm font-bold">Facturación y fiscalidad</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Comprobantes y resumen imponible del período seleccionado.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Comprobantes
              </p>
              <p className="mt-1 text-xl font-bold">{facturacionFiscal.totalComprobantes}</p>
            </div>
            <div className="rounded-xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Base imponible
              </p>
              <p className="mt-1 text-xl font-bold">
                {formatearMonto(
                  facturacionFiscal.baseImponibleUsd,
                  facturacionFiscal.baseImponibleVes,
                  moneda
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                IVA
              </p>
              <p className="mt-1 text-xl font-bold">
                {formatearMonto(
                  facturacionFiscal.ivaUsd,
                  facturacionFiscal.ivaVes,
                  moneda
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Total
              </p>
              <p className="mt-1 text-xl font-bold">
                {formatearMonto(facturacionFiscal.totalUsd, facturacionFiscal.totalVes, moneda)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-[var(--texto-tenue)]">
            Tipo de IVA configurado: {facturacionFiscal.tipoIva}%. Este resumen es local y no
            reemplaza la emisión fiscal del comprobante.
          </p>
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Productos más vendidos</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Ranking por {nombreProductos.toLowerCase()} en el período.
              </p>
            </div>
            <Selector
              value={criterioProductos}
              onChange={(evento) => setCriterioProductos(evento.target.value)}
              className="h-8 w-auto text-[11px]"
              aria-label="Criterio de productos"
            >
              {CRITERIOS_PRODUCTOS.map((criterio) => (
                <option key={criterio.valor} value={criterio.valor}>
                  {criterio.etiqueta}
                </option>
              ))}
            </Selector>
          </div>
          <GraficoProductos
            datos={topProductos.slice(0, 6)}
            altura={290}
            moneda={monedaProductos}
            sufijo={sufijoProductos}
            nombre={nombreProductos}
          />
          {topProductos.length ? (
            <div className="mt-3 space-y-1.5 border-t border-[var(--borde)] pt-3">
              {topProductos.slice(0, 3).map((producto, indice) => (
                <div
                  key={producto.sku || producto.nombre}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="truncate text-[var(--texto-suave)]">
                    {indice + 1}. {producto.nombre}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatearProducto(producto)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold">Ventas por día y hora</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Concentración de ventas para detectar tus mejores momentos.
            </p>
          </div>
          <MapaCalorHorarios resumen={resumenHorario} moneda={moneda} />
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold">Composición del período</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Cómo se reparte el dinero de tus ventas netas.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-3 overflow-hidden rounded-full bg-[var(--superficie-3)]">
              <div
                className="h-full bg-[var(--advertencia)]"
                style={{ width: `${costoBarra}%` }}
              />
              <div
                className="h-full bg-[var(--primario)]"
                style={{ width: `${gananciaBarra}%` }}
              />
            </div>
            <div className="grid gap-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[var(--texto-suave)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--advertencia)]" />
                  Costo de productos
                </span>
                <strong>
                  {formatearMonto(
                    totales.costoUsd,
                    costoComposicionMoneda,
                    moneda
                  )}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[var(--texto-suave)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--primario)]" />
                  Ganancia bruta
                </span>
                <strong>
                  {formatearMonto(
                    totales.gananciaUsd,
                    totales.gananciaVes,
                    moneda
                  )}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[var(--borde)] pt-2">
                <span className="text-[var(--texto-suave)]">Descuentos aplicados</span>
                <strong>
                  {formatearMonto(
                    totales.descuentoUsd,
                    totales.descuentoVes,
                    moneda
                  )}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--texto-suave)]">IVA cobrado</span>
                <strong>
                  {formatearMonto(totales.ivaUsd, totales.ivaVes, moneda)}
                </strong>
              </div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--borde)] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Historial de facturas</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Últimas ventas registradas en este dispositivo.
              </p>
            </div>
            <Etiqueta variante="neutra">{ventas.length} total</Etiqueta>
          </div>

          {recientes.length === 0 ? (
            <EstadoVacio
              icono={ReceiptText}
              titulo="Todavía no hay ventas"
              descripcion="Cuando cobres tu primera venta aparecerá aquí con su factura."
            />
          ) : (
            <div className="divide-y divide-[var(--borde)]">
              {recientes.map((venta) => {
                const metodo =
                  TIPOS_PAGO.find((tipo) => tipo.valor === venta.tipoPago)?.etiqueta ||
                  venta.tipoPago;
                return (
                  <div
                    key={venta.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-mono text-[11px] font-semibold">
                          {venta.numeroFactura}
                        </p>
                        <Etiqueta variante={varianteEstado(venta.estado)}>
                          {etiquetaEstadoVenta(venta.estado)}
                        </Etiqueta>
                      </div>
                      <p className="truncate text-[10px] text-[var(--texto-suave)]">
                        {formatearFechaHora(venta.fecha)} · {metodo}
                        {venta.clienteNombre ? ` · ${venta.clienteNombre}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <div className="mr-1 text-right">
                        <p className="text-xs font-bold">
                          {formatearVes(venta.totalVes)}
                        </p>
                        <p className="text-[10px] text-[var(--texto-tenue)]">
                          {venta.estado === "reportada"
                            ? "Fuera del análisis"
                            : venta.estado === "cancelada"
                              ? "Sin efecto"
                              : formatearUsd(venta.totalUsd)}
                        </p>
                      </div>
                      <Boton
                        variante="fantasma"
                        tamano="icono"
                        title="Ver factura"
                        onClick={() => setFactura(venta)}
                      >
                        <Eye className="h-4 w-4" />
                      </Boton>
                      {esVentaEnAnalisis(venta) ? (
                        <Boton
                          variante="fantasma"
                          tamano="icono"
                          title="Reportar error"
                          onClick={() => setVentaReportar(venta)}
                        >
                          <TriangleAlert className="h-4 w-4 text-[var(--advertencia)]" />
                        </Boton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Tarjeta>
      </div>

      <ModalFactura
        abierto={Boolean(factura)}
        venta={factura}
        perfil={perfil}
        onCerrar={() => setFactura(null)}
      />
      <ModalReportarError
        abierto={Boolean(ventaReportar)}
        venta={ventaReportar}
        onCerrar={() => setVentaReportar(null)}
        onReportada={() => setFactura(null)}
      />
    </div>
  );
}
