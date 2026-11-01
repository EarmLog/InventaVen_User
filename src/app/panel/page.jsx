"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  PackagePlus,
  ReceiptText,
  ScanBarcode,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { useSesion } from "@/context/SesionContext";
import { useTasa } from "@/context/TasaContext";
import Tarjeta from "@/components/ui/Tarjeta";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import FiltroFechas from "@/components/ui/FiltroFechas";
import { GraficoVentasDias } from "@/components/modules/analisis/Graficos";
import {
  agruparVentasPorRango,
  fechaParaInput,
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  formatearUsd,
  formatearVes,
  redondear,
  sumarDias,
  ventasEnRango,
} from "@/lib/utilidades/formato";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import { esVentaEnAnalisis } from "@/lib/utilidades/ventas";

function TarjetaIndicador({ Icono, etiqueta, valor, detalle, tono = "verde" }) {
  const tonos = {
    verde: "bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
    azul: "bg-[var(--info-suave)] text-[var(--info)]",
    ambar: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
    violeta: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  };
  return (
    <Tarjeta className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            {etiqueta}
          </p>
          <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-[var(--texto)]">
            {valor}
          </p>
          <p className="mt-1 truncate text-[11px] text-[var(--texto-tenue)]">{detalle}</p>
        </div>
        <span
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tonos[tono] || tonos.verde,
          ].join(" ")}
        >
          <Icono className="h-5 w-5" />
        </span>
      </div>
    </Tarjeta>
  );
}

export default function PaginaPanel() {
  const { perfil } = useSesion();
  const { tasa } = useTasa();
  const productos =
    useLiveQuery(() => (db ? db.productos.toArray() : []), [], []) || [];
  const ventas = useLiveQuery(() => (db ? db.ventas.toArray() : []), [], []) || [];
  const [desde, setDesde] = useState(() =>
    fechaParaInput(sumarDias(new Date(), -6))
  );
  const [hasta, setHasta] = useState(() => fechaParaInput(new Date()));

  const ventasValidas = useMemo(
    () => ventas.filter(esVentaEnAnalisis),
    [ventas]
  );
  const hoy = fechaParaInput(new Date());
  const ventasHoy = ventasValidas.filter(
    (venta) => fechaParaInput(venta.fecha) === hoy
  );
  const totalHoyUsd = redondear(
    ventasHoy.reduce((total, venta) => total + Number(venta.totalUsd || 0), 0)
  );
  const totalHoyVes = redondear(
    ventasHoy.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
  );
  const gananciaHoyVes = redondear(
    ventasHoy.reduce(
      (total, venta) =>
        total + Number(venta.gananciaUsd || 0) * Number(venta.tasaUsd || 0),
      0
    )
  );
  const productosActivos = productos.filter((producto) => producto.activo !== false);
  const stockBajo = productosActivos.filter(
    (producto) => Number(producto.stock) <= Number(producto.stockMinimo || 0)
  );

  const ventasPeriodo = useMemo(
    () => ventasEnRango(ventasValidas, desde, hasta),
    [ventasValidas, desde, hasta]
  );
  const datosPeriodo = useMemo(
    () => agruparVentasPorRango(ventasPeriodo, desde, hasta),
    [ventasPeriodo, desde, hasta]
  );
  const totalPeriodoVes = redondear(
    ventasPeriodo.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
  );
  const desdeVisible = formatearFecha(new Date(`${desde}T12:00:00`));
  const hastaVisible = formatearFecha(new Date(`${hasta}T12:00:00`));

  const ranking = new Map();
  ventasPeriodo.forEach((venta) => {
    (venta.items || []).forEach((item) => {
      const clave = item.sku || item.nombre;
      const actual = ranking.get(clave) || {
        nombre: item.nombre,
        sku: item.sku,
        cantidad: 0,
        totalVes: 0,
      };
      actual.cantidad += Number(item.cantidad) || 0;
      actual.totalVes += Number(item.totalLineaVes) || 0;
      ranking.set(clave, actual);
    });
  });
  const topProductos = [...ranking.values()]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
  const recientes = [...ventas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  const dias = Number(perfil?.diasLicencia ?? 0);
  const nombre = perfil?.nombreNegocio || "tu negocio";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primario)]">
            Resumen de hoy
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Hola, {nombre}
          </h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Esto es lo que está pasando en tu negocio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/panel/pos"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primario)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primario-fuerte)]"
          >
            <ShoppingCart className="h-4 w-4" />
            Nueva venta
          </Link>
          <Link
            href="/panel/inventario"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
          >
            <PackagePlus className="h-4 w-4" />
            Registrar producto
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          Icono={CircleDollarSign}
          etiqueta="Ventas de hoy"
          valor={formatearVes(totalHoyVes)}
          detalle={`${ventasHoy.length} venta${ventasHoy.length === 1 ? "" : "s"} · ${formatearUsd(totalHoyUsd)}`}
        />
        <TarjetaIndicador
          Icono={TrendingUp}
          etiqueta="Ganancia de hoy"
          valor={formatearVes(gananciaHoyVes)}
          detalle={
            totalHoyVes > 0
              ? `${redondear((gananciaHoyVes / totalHoyVes) * 100)}% de margen`
              : "Aún sin ventas hoy"
          }
          tono="azul"
        />
        <TarjetaIndicador
          Icono={Boxes}
          etiqueta="Productos activos"
          valor={formatearNumero(productosActivos.length)}
          detalle={`${productos.reduce((total, producto) => total + (producto.variantes?.length || 0), 0)} variantes registradas`}
          tono="violeta"
        />
        <TarjetaIndicador
          Icono={AlertTriangle}
          etiqueta="Stock bajo"
          valor={formatearNumero(stockBajo.length)}
          detalle={
            stockBajo.length
              ? "Revisa tu inventario para renovar"
              : "Todo tu inventario está saludable"
          }
          tono={stockBajo.length ? "ambar" : "verde"}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold">Rendimiento del período</h2>
          <p className="text-[11px] text-[var(--texto-suave)]">
            Del {desdeVisible} al {hastaVisible}
          </p>
        </div>
        <FiltroFechas
          desde={desde}
          hasta={hasta}
          onCambiar={({ desde: nuevoDesde, hasta: nuevoHasta }) => {
            setDesde(nuevoDesde);
            setHasta(nuevoHasta);
          }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Ventas del período</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Totales en bolívares, sin ventas reportadas.
              </p>
            </div>
            <Etiqueta variante="exito">
              <TrendingUp className="h-3 w-3" />
              {formatearVes(totalPeriodoVes)}
            </Etiqueta>
          </div>
          <GraficoVentasDias datos={datosPeriodo} altura={260} />
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Licencia</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Controlada desde la app de administración.
              </p>
            </div>
            <CalendarClock
              className={["h-5 w-5", dias > 0 ? "text-[var(--primario)]" : "text-[var(--peligro)]"].join(" ")}
            />
          </div>
          <div className="rounded-2xl border border-[var(--borde)] bg-[var(--superficie-2)] p-4">
            <p className="text-3xl font-bold tracking-tight">
              {dias}
              <span className="ml-1 text-sm font-medium text-[var(--texto-suave)]">
                día{dias === 1 ? "" : "s"} restantes
              </span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--superficie-3)]">
              <div
                className={["h-full rounded-full", dias > 0 ? "bg-[var(--primario)]" : "bg-[var(--peligro)]"].join(" ")}
                style={{ width: `${Math.min(100, Math.max(4, (dias / 30) * 100))}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--texto-suave)]">
              {dias > 0
                ? "Tu licencia está activa. Si necesitas más días, solicítalo al administrador."
                : "Tu licencia está en cero. InventaVen sigue funcionando, pero puedes renovarla cuando quieras."}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--borde)] px-3 py-2.5 text-[11px]">
            <span className="text-[var(--texto-suave)]">Tasa del dólar</span>
            <strong>{tasa > 0 ? formatearVes(tasa) : "No disponible"}</strong>
          </div>
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Productos más vendidos</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Ranking por unidades en el período seleccionado.
              </p>
            </div>
            <Link
              href="/panel/analisis"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primario)] hover:underline"
            >
              Ver análisis <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topProductos.length ? (
            <div className="space-y-2">
              {topProductos.map((producto, indice) => (
                <div
                  key={producto.sku}
                  className="flex items-center gap-3 rounded-xl border border-[var(--borde)] px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--superficie-3)] text-[11px] font-bold text-[var(--texto-suave)]">
                    {indice + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{producto.nombre}</p>
                    <p className="truncate text-[10px] text-[var(--texto-tenue)]">
                      {producto.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{formatearNumero(producto.cantidad)} uds.</p>
                    <p className="text-[10px] text-[var(--texto-tenue)]">
                      {formatearVes(producto.totalVes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EstadoVacio
              icono={BarChart3}
              titulo="Aún no hay ventas en el período"
              descripcion="Cambia las fechas o registra una venta para ver tus productos estrella."
            />
          )}
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Últimas ventas</h2>
              <p className="text-[11px] text-[var(--texto-suave)]">
                Movimientos recientes de tu negocio.
              </p>
            </div>
            <Link
              href="/panel/analisis"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primario)] hover:underline"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recientes.length ? (
            <div className="space-y-2">
              {recientes.map((venta) => (
                <div
                  key={venta.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--borde)] px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
                    <ReceiptText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{venta.numeroFactura}</p>
                    <p className="truncate text-[10px] text-[var(--texto-tenue)]">
                      {formatearFechaHora(venta.fecha)} ·{" "}
                      {TIPOS_PAGO.find((tipo) => tipo.valor === venta.tipoPago)?.etiqueta ||
                        venta.tipoPago}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{formatearVes(venta.totalVes)}</p>
                    <p className="text-[10px] text-[var(--texto-tenue)]">
                      {venta.estado === "reportada"
                        ? "Reportada"
                        : venta.estado === "cancelada"
                          ? "Cancelada"
                          : formatearUsd(venta.totalUsd)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EstadoVacio
              icono={ScanBarcode}
              titulo="Todavía no hay ventas"
              descripcion="Abre el punto de venta y registra tu primera factura."
              accion={
                <Link
                  href="/panel/pos"
                  className="rounded-xl bg-[var(--primario)] px-4 py-2 text-xs font-semibold text-white"
                >
                  Ir al punto de venta
                </Link>
              }
            />
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
