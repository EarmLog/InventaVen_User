"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  CircleDollarSign,
  Eye,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { useSesion } from "@/context/SesionContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import FiltroFechas from "@/components/ui/FiltroFechas";
import ModalFactura from "@/components/modules/pos/ModalFactura";
import ModalReportarError from "@/components/modules/analisis/ModalReportarError";
import {
  GraficoPagos,
  GraficoProductos,
  GraficoVentasDias,
} from "@/components/modules/analisis/Graficos";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import {
  agruparVentasPorRango,
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
  esVentaEnAnalisis,
  etiquetaEstadoVenta,
} from "@/lib/utilidades/ventas";

function Indicador({ Icono, etiqueta, valor, detalle, tono = "verde" }) {
  const tonos = {
    verde: "bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
    azul: "bg-[var(--info-suave)] text-[var(--info)]",
    ambar: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
    violeta: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  };
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
  const [desde, setDesde] = useState(() =>
    fechaParaInput(sumarDias(new Date(), -29))
  );
  const [hasta, setHasta] = useState(() => fechaParaInput(new Date()));
  const [factura, setFactura] = useState(null);
  const [ventaReportar, setVentaReportar] = useState(null);

  const ventasValidas = useMemo(
    () => ventas.filter(esVentaEnAnalisis),
    [ventas]
  );

  const enRango = useMemo(
    () => ventasEnRango(ventasValidas, desde, hasta),
    [ventasValidas, desde, hasta]
  );

  const totales = useMemo(() => {
    const totalUsd = redondear(
      enRango.reduce((total, venta) => total + Number(venta.totalUsd || 0), 0)
    );
    const totalVes = redondear(
      enRango.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
    );
    const gananciaUsd = redondear(
      enRango.reduce((total, venta) => total + Number(venta.gananciaUsd || 0), 0)
    );
    const gananciaVes = redondear(
      enRango.reduce(
        (total, venta) =>
          total +
          Number(venta.gananciaUsd || 0) * Number(venta.tasaUsd || 0),
        0
      )
    );
    const baseVes = redondear(
      enRango.reduce(
        (total, venta) =>
          total +
          (Number(venta.totalVes || 0) - Number(venta.ivaVes || 0)),
        0
      )
    );
    const unidades = enRango.reduce(
      (total, venta) =>
        total +
        (venta.items || []).reduce(
          (suma, item) => suma + Number(item.cantidad || 0),
          0
        ),
      0
    );
    const ticketVes = enRango.length ? redondear(totalVes / enRango.length) : 0;
    return {
      totalUsd,
      totalVes,
      gananciaUsd,
      gananciaVes,
      baseVes,
      margen: baseVes > 0 ? redondear((gananciaVes / baseVes) * 100) : 0,
      unidades,
      ticketVes,
    };
  }, [enRango]);

  const datosDias = useMemo(
    () => agruparVentasPorRango(enRango, desde, hasta),
    [enRango, desde, hasta]
  );

  const datosPagos = useMemo(() => {
    return TIPOS_PAGO.map((tipo) => ({
      nombre: tipo.etiqueta,
      totalVes: redondear(
        enRango
          .filter((venta) => venta.tipoPago === tipo.valor)
          .reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
      ),
    })).filter((registro) => registro.totalVes > 0);
  }, [enRango]);

  const topProductos = useMemo(() => {
    const mapa = new Map();
    enRango.forEach((venta) => {
      (venta.items || []).forEach((item) => {
        const clave = item.sku || item.nombre;
        const actual = mapa.get(clave) || {
          nombre: item.nombre,
          sku: item.sku,
          cantidad: 0,
          totalVes: 0,
        };
        actual.cantidad += Number(item.cantidad) || 0;
        actual.totalVes += Number(item.totalLineaVes) || 0;
        mapa.set(clave, actual);
      });
    });
    return [...mapa.values()]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8)
      .map((producto) => ({
        ...producto,
        nombreCorto:
          producto.nombre.length > 22
            ? `${producto.nombre.slice(0, 21)}…`
            : producto.nombre,
      }));
  }, [enRango]);

  const recientes = ventas.slice(0, 12);
  const desdeVisible = formatearFecha(new Date(`${desde}T12:00:00`));
  const hastaVisible = formatearFecha(new Date(`${hasta}T12:00:00`));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análisis de ventas</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Del {desdeVisible} al {hastaVisible}. Las ventas reportadas no se incluyen.
          </p>
        </div>
        <Etiqueta variante="exito">
          <ReceiptText className="h-3 w-3" />
          {enRango.length} factura{enRango.length === 1 ? "" : "s"}
        </Etiqueta>
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
          valor={formatearVes(totales.totalVes)}
          detalle={`${enRango.length} factura${enRango.length === 1 ? "" : "s"} · ${formatearUsd(totales.totalUsd)}`}
        />
        <Indicador
          Icono={TrendingUp}
          etiqueta="Ganancia estimada"
          valor={formatearVes(totales.gananciaVes)}
          detalle={`${formatearUsd(totales.gananciaUsd)} · ${formatearPorcentaje(totales.margen)} de margen`}
          tono="azul"
        />
        <Indicador
          Icono={ReceiptText}
          etiqueta="Ticket promedio"
          valor={formatearVes(totales.ticketVes)}
          detalle="Por factura emitida"
          tono="violeta"
        />
        <Indicador
          Icono={ShoppingBag}
          etiqueta="Unidades vendidas"
          valor={formatearNumero(totales.unidades)}
          detalle="Incluye variantes y bultos"
          tono="ambar"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Evolución de ventas</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Monto facturado por día en bolívares.
              </p>
            </div>
            <Etiqueta variante="exito">
              <BarChart3 className="h-3 w-3" />
              {formatearVes(totales.totalVes)}
            </Etiqueta>
          </div>
          <GraficoVentasDias datos={datosDias} altura={270} />
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-sm font-bold">Métodos de pago</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Distribución de los ingresos del período en bolívares.
            </p>
          </div>
          <GraficoPagos datos={datosPagos} altura={260} />
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-sm font-bold">Productos más vendidos</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Ranking por unidades dentro del período.
            </p>
          </div>
          <GraficoProductos datos={topProductos.slice(0, 6)} altura={290} />
          {topProductos.length ? (
            <div className="mt-3 space-y-1.5 border-t border-[var(--borde)] pt-3">
              {topProductos.slice(0, 3).map((producto, indice) => (
                <div
                  key={producto.sku}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="truncate text-[var(--texto-suave)]">
                    {indice + 1}. {producto.nombre}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatearVes(producto.totalVes)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
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
                        <p className="text-xs font-bold">{formatearVes(venta.totalVes)}</p>
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
