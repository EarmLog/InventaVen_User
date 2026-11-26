"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  PackageOpen,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import Alerta from "@/components/ui/Alerta";
import {
  GraficoCategorias,
  GraficoGananciaMargen,
  GraficoPagos,
  GraficoProductos,
  GraficoVentasDias,
} from "@/components/modules/analisis/Graficos";
import {
  calcularTotales,
  costoDeItem,
  rankingProductos,
  tasaDeVenta,
} from "@/lib/utilidades/analisis";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import {
  formatearFechaHora,
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  redondear,
} from "@/lib/utilidades/formato";

const CONFIG = {
  ventas: {
    titulo: "Ventas de hoy",
    descripcion: "Resumen de las facturas registradas durante el día.",
    enlace: { href: "/panel/analisis", texto: "Ver análisis completo" },
  },
  ganancia: {
    titulo: "Ganancia de hoy",
    descripcion: "Ganancia bruta calculada con el costo de cada producto vendido.",
    enlace: { href: "/panel/analisis", texto: "Ver análisis completo" },
  },
  productos: {
    titulo: "Productos activos",
    descripcion: "Productos disponibles para la venta en tu inventario.",
    enlace: { href: "/panel/inventario", texto: "Ir al inventario" },
  },
  stock: {
    titulo: "Stock bajo",
    descripcion: "Productos que alcanzaron o están por debajo de su stock mínimo.",
    enlace: { href: "/panel/inventario", texto: "Revisar inventario" },
  },
};

function Metrica({ etiqueta, valor, detalle, tono = "neutro" }) {
  const tonos = {
    neutro: "border-[var(--borde)] bg-[var(--superficie-2)]",
    verde: "border-[var(--primario)]/25 bg-[var(--primario-suave)]",
    azul: "border-[var(--info)]/25 bg-[var(--info-suave)]",
    ambar: "border-[var(--advertencia)]/25 bg-[var(--advertencia-suave)]",
  };

  return (
    <div className={["rounded-xl border p-3", tonos[tono] || tonos.neutro].join(" ")}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
        {etiqueta}
      </p>
      <p className="mt-1 text-base font-bold tracking-tight text-[var(--texto)]">
        {valor}
      </p>
      {detalle ? (
        <p className="mt-0.5 text-[10px] text-[var(--texto-tenue)]">{detalle}</p>
      ) : null}
    </div>
  );
}

function nombreCorto(texto, maximo = 20) {
  const limpio = String(texto || "Sin categoría");
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1)}…` : limpio;
}

function agruparVentasPorHora(ventas) {
  const mapa = new Map();

  ventas.forEach((venta) => {
    const fecha = new Date(venta.fecha);
    if (Number.isNaN(fecha.getTime())) return;
    const hora = fecha.getHours();
    const tasa = tasaDeVenta(venta);
    const costoGuardado = Number(venta.costoTotalUsd);
    const costoUsd = Number.isFinite(costoGuardado)
      ? costoGuardado
      : (venta.items || []).reduce((total, item) => total + costoDeItem(item), 0);
    const gananciaGuardada = Number(venta.gananciaUsd);
    const gananciaUsd = Number.isFinite(gananciaGuardada)
      ? gananciaGuardada
      : (Number(venta.baseUsd) || 0) - costoUsd;
    const actual = mapa.get(hora) || {
      totalUsd: 0,
      totalVes: 0,
      baseUsd: 0,
      baseVes: 0,
      gananciaUsd: 0,
      gananciaVes: 0,
      facturas: 0,
    };

    actual.totalUsd += Number(venta.totalUsd) || 0;
    actual.totalVes += Number(venta.totalVes) || 0;
    actual.baseUsd += Number(venta.baseUsd) || 0;
    actual.baseVes += Number(venta.baseVes) || 0;
    actual.gananciaUsd += gananciaUsd;
    actual.gananciaVes += gananciaUsd * tasa;
    actual.facturas += 1;
    mapa.set(hora, actual);
  });

  if (!mapa.size) return [];

  const horas = [...mapa.keys()];
  const min = Math.min(...horas);
  const max = Math.max(...horas);

  return Array.from({ length: max - min + 1 }, (_, indice) => {
    const hora = min + indice;
    const datos = mapa.get(hora) || {
      totalUsd: 0,
      totalVes: 0,
      baseUsd: 0,
      baseVes: 0,
      gananciaUsd: 0,
      gananciaVes: 0,
      facturas: 0,
    };

    return {
      hora,
      etiqueta: `${String(hora).padStart(2, "0")}:00`,
      totalUsd: redondear(datos.totalUsd),
      totalVes: redondear(datos.totalVes),
      baseUsd: redondear(datos.baseUsd),
      baseVes: redondear(datos.baseVes),
      gananciaUsd: redondear(datos.gananciaUsd),
      gananciaVes: redondear(datos.gananciaVes),
      margenUsd:
        datos.baseUsd > 0
          ? redondear((datos.gananciaUsd / datos.baseUsd) * 100, 1)
          : 0,
      margenVes:
        datos.baseVes > 0
          ? redondear((datos.gananciaVes / datos.baseVes) * 100, 1)
          : 0,
      facturas: datos.facturas,
    };
  });
}

function ListaVentas({ ventas }) {
  if (!ventas.length) return null;

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {ventas.map((venta) => (
        <div
          key={venta.id}
          className="flex items-center gap-2.5 rounded-xl border border-[var(--borde)] px-2.5 py-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
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
              {formatearUsd(venta.totalUsd)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListaRanking({ productos, criterio = "unidades" }) {
  if (!productos.length) {
    return (
      <p className="rounded-xl border border-[var(--borde)] px-3 py-4 text-center text-xs text-[var(--texto-suave)]">
        Sin productos vendidos hoy.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {productos.map((producto, indice) => (
        <div
          key={producto.sku || producto.nombre}
          className="flex items-center gap-2.5 rounded-xl border border-[var(--borde)] px-2.5 py-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--superficie-3)] text-[11px] font-bold text-[var(--texto-suave)]">
            {indice + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{producto.nombre}</p>
            <p className="truncate text-[10px] text-[var(--texto-tenue)]">
              {producto.sku}
            </p>
          </div>
          <div className="text-right">
            {criterio === "ganancia" ? (
              <>
                <p className="text-xs font-bold">{formatearVes(producto.gananciaVes)}</p>
                <p className="text-[10px] text-[var(--texto-tenue)]">
                  {formatearPorcentaje(producto.margenVes)} de margen
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold">
                  {formatearNumero(producto.cantidad)} uds.
                </p>
                <p className="text-[10px] text-[var(--texto-tenue)]">
                  {formatearVes(producto.totalVes)}
                </p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ModalDetalleIndicador({
  abierto,
  tipo = "ventas",
  onCerrar,
  ventas = [],
  productos = [],
}) {
  const config = CONFIG[tipo] || CONFIG.ventas;

  const resumen = useMemo(() => calcularTotales(ventas), [ventas]);
  const actividadHoraria = useMemo(() => agruparVentasPorHora(ventas), [ventas]);
  const ventasOrdenadas = useMemo(
    () => [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [ventas]
  );
  const pagos = useMemo(
    () =>
      TIPOS_PAGO.map((tipoPago) => {
        const filtradas = ventas.filter((venta) => venta.tipoPago === tipoPago.valor);
        return {
          nombre: tipoPago.etiqueta,
          totalUsd: redondear(
            filtradas.reduce((total, venta) => total + Number(venta.totalUsd || 0), 0)
          ),
          totalVes: redondear(
            filtradas.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
          ),
          cantidad: filtradas.length,
        };
      }).filter((registro) => registro.totalUsd > 0 || registro.totalVes > 0),
    [ventas]
  );
  const rankingGanancia = useMemo(
    () => rankingProductos(ventas, "ganancia", "VES").slice(0, 6),
    [ventas]
  );
  const rankingUnidades = useMemo(
    () => rankingProductos(ventas, "unidades", "VES").slice(0, 6),
    [ventas]
  );

  const activos = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos]
  );
  const stockBajo = useMemo(
    () =>
      activos.filter(
        (producto) => Number(producto.stock) <= Number(producto.stockMinimo || 0)
      ),
    [activos]
  );
  const agotados = stockBajo.filter((producto) => Number(producto.stock) <= 0);
  const totalVariantes = activos.reduce(
    (total, producto) => total + (producto.variantes?.length || 0),
    0
  );
  const totalUnidades = redondear(
    activos.reduce((total, producto) => total + Number(producto.stock || 0), 0),
    3
  );
  const valorCompraVes = redondear(
    activos.reduce(
      (total, producto) =>
        total + Number(producto.stock || 0) * Number(producto.precioCompraVes || 0),
      0
    )
  );
  const valorVentaVes = redondear(
    activos.reduce(
      (total, producto) =>
        total + Number(producto.stock || 0) * Number(producto.precioVentaVes || 0),
      0
    )
  );
  const valorVentaUsd = redondear(
    activos.reduce(
      (total, producto) =>
        total + Number(producto.stock || 0) * Number(producto.precioVentaUsd || 0),
      0
    )
  );

  const resumenCategorias = useMemo(() => {
    const mapa = new Map();

    activos.forEach((producto) => {
      const categoria = producto.categoria || "Sin categoría";
      const actual = mapa.get(categoria) || {
        nombre: categoria,
        cantidad: 0,
        unidades: 0,
        valorVes: 0,
      };
      actual.cantidad += 1;
      actual.unidades += Number(producto.stock) || 0;
      actual.valorVes +=
        (Number(producto.stock) || 0) * (Number(producto.precioVentaVes) || 0);
      mapa.set(categoria, actual);
    });

    return [...mapa.values()]
      .map((categoria) => ({
        ...categoria,
        unidades: redondear(categoria.unidades, 3),
        valorVes: redondear(categoria.valorVes),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [activos]);

  const datosCategorias = resumenCategorias.slice(0, 8).map((categoria) => ({
    nombre: categoria.nombre,
    nombreCorto: nombreCorto(categoria.nombre),
    valor: categoria.cantidad,
  }));

  const stockOrdenado = useMemo(
    () => [...stockBajo].sort((a, b) => Number(a.stock) - Number(b.stock)),
    [stockBajo]
  );
  const datosStock = stockOrdenado.slice(0, 8).map((producto) => ({
    nombre: producto.nombre,
    nombreCorto: nombreCorto(producto.nombre, 24),
    valor: Number(producto.stock) || 0,
  }));
  const productosDestacados = useMemo(
    () =>
      [...activos]
        .sort(
          (a, b) =>
            Number(b.stock || 0) * Number(b.precioVentaUsd || 0) -
            Number(a.stock || 0) * Number(a.precioVentaUsd || 0)
        )
        .slice(0, 10),
    [activos]
  );

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={config.titulo}
      descripcion={config.descripcion}
      ancho="xl"
      pie={
        <Link
          href={config.enlace.href}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primario)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primario-fuerte)]"
        >
          {config.enlace.texto}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {tipo === "ventas" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metrica
              etiqueta="Ventas en Bs."
              valor={formatearVes(resumen.totalVes)}
              detalle={formatearUsd(resumen.totalUsd)}
              tono="verde"
            />
            <Metrica
              etiqueta="Facturas"
              valor={formatearNumero(resumen.facturas)}
              detalle="Ventas válidas de hoy"
            />
            <Metrica
              etiqueta="Ticket promedio"
              valor={formatearVes(resumen.ticketVes)}
              detalle={formatearUsd(resumen.ticketUsd)}
              tono="azul"
            />
            <Metrica
              etiqueta="Unidades"
              valor={formatearNumero(resumen.unidades)}
              detalle="Productos vendidos"
            />
          </div>

          {ventas.length ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <section className="rounded-2xl border border-[var(--borde)] p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                    Ventas por hora
                  </h3>
                  <GraficoVentasDias datos={actividadHoraria} altura={230} />
                </section>
                <section className="rounded-2xl border border-[var(--borde)] p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                    Métodos de pago
                  </h3>
                  <GraficoPagos datos={pagos} altura={230} />
                </section>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-[var(--borde)] p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                    Facturas de hoy
                  </h3>
                  <ListaVentas ventas={ventasOrdenadas} />
                </section>
                <section className="rounded-2xl border border-[var(--borde)] p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                    Productos más vendidos
                  </h3>
                  <ListaRanking productos={rankingUnidades} />
                </section>
              </div>
            </>
          ) : (
            <EstadoVacio
              icono={ReceiptText}
              titulo="Aún no hay ventas hoy"
              descripcion="Cuando registres una venta en el POS verás aquí el detalle y las gráficas del día."
            />
          )}
        </div>
      ) : null}

      {tipo === "ganancia" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metrica
              etiqueta="Ganancia en Bs."
              valor={formatearVes(resumen.gananciaVes)}
              detalle={formatearUsd(resumen.gananciaUsd)}
              tono="azul"
            />
            <Metrica
              etiqueta="Margen"
              valor={formatearPorcentaje(resumen.margenVes)}
              detalle="Sobre la venta sin IVA"
              tono="verde"
            />
            <Metrica
              etiqueta="Costo de ventas"
              valor={formatearVes(resumen.costoVes)}
              detalle={formatearUsd(resumen.costoUsd)}
            />
            <Metrica
              etiqueta="Base de ventas"
              valor={formatearVes(resumen.baseVes)}
              detalle={formatearUsd(resumen.baseUsd)}
            />
          </div>

          {ventas.length ? (
            <>
              <section className="rounded-2xl border border-[var(--borde)] p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                  Ganancia y margen por hora
                </h3>
                <GraficoGananciaMargen datos={actividadHoraria} altura={250} />
              </section>

              <section className="rounded-2xl border border-[var(--borde)] p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                  Productos que más ganancia dejaron
                </h3>
                <ListaRanking productos={rankingGanancia} criterio="ganancia" />
              </section>
            </>
          ) : (
            <EstadoVacio
              icono={TrendingUp}
              titulo="Aún no hay ganancia registrada hoy"
              descripcion="La ganancia se calcula con el costo de compra y el precio de venta de cada producto."
            />
          )}
        </div>
      ) : null}

      {tipo === "productos" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metrica
              etiqueta="Activos"
              valor={formatearNumero(activos.length)}
              detalle="Disponibles para vender"
              tono="verde"
            />
            <Metrica
              etiqueta="Variantes"
              valor={formatearNumero(totalVariantes)}
              detalle="Registradas en el catálogo"
              tono="azul"
            />
            <Metrica
              etiqueta="Categorías"
              valor={formatearNumero(resumenCategorias.length)}
              detalle="En tu inventario"
            />
            <Metrica
              etiqueta="Valor de venta"
              valor={formatearVes(valorVentaVes)}
              detalle={formatearUsd(valorVentaUsd)}
            />
          </div>

          {activos.length ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <section className="rounded-2xl border border-[var(--borde)] p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                    Productos por categoría
                  </h3>
                  <GraficoCategorias
                    datos={datosCategorias}
                    altura={230}
                    moneda={null}
                    nombre="Productos"
                  />
                </section>
                <section className="rounded-2xl border border-[var(--borde)] p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                    Productos con mayor valor en stock
                  </h3>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {productosDestacados.map((producto) => (
                      <div
                        key={producto.id}
                        className="flex items-center gap-2.5 rounded-xl border border-[var(--borde)] px-2.5 py-2"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--superficie-3)] text-[var(--texto-suave)]">
                          <Boxes className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {producto.nombre}
                          </p>
                          <p className="truncate text-[10px] text-[var(--texto-tenue)]">
                            {producto.categoria || "Sin categoría"} ·{" "}
                            {formatearNumero(producto.stock)} uds.
                          </p>
                        </div>
                        <p className="text-right text-xs font-bold">
                          {formatearVes(producto.precioVentaVes)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2.5 text-[11px]">
                <span className="text-[var(--texto-suave)]">
                  Unidades totales en inventario
                </span>
                <strong>{formatearNumero(totalUnidades)}</strong>
              </div>
            </>
          ) : (
            <EstadoVacio
              icono={PackageOpen}
              titulo="No tienes productos activos"
              descripcion="Registra o activa productos para verlos aquí y comenzar a vender."
            />
          )}
        </div>
      ) : null}

      {tipo === "stock" ? (
        <div className="space-y-4">
          <Alerta tipo={agotados.length ? "advertencia" : "info"}>
            {agotados.length
              ? `Hay ${formatearNumero(agotados.length)} producto${
                  agotados.length === 1 ? "" : "s"
                } agotado${agotados.length === 1 ? "" : "s"}. Repón el stock para seguir vendiendo.`
              : "Revisa estos productos para mantener tu inventario saludable."}
          </Alerta>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metrica
              etiqueta="En alerta"
              valor={formatearNumero(stockBajo.length)}
              detalle="Igual o bajo el mínimo"
              tono="ambar"
            />
            <Metrica
              etiqueta="Agotados"
              valor={formatearNumero(agotados.length)}
              detalle="Sin unidades disponibles"
            />
            <Metrica
              etiqueta="Unidades en stock"
              valor={formatearNumero(totalUnidades)}
              detalle="En productos activos"
            />
            <Metrica
              etiqueta="Valor de compra"
              valor={formatearVes(valorCompraVes)}
              detalle="Del inventario activo"
              tono="azul"
            />
          </div>

          {stockBajo.length ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <section className="rounded-2xl border border-[var(--borde)] p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                  Menor stock disponible
                </h3>
                <GraficoProductos
                  datos={datosStock}
                  altura={240}
                  moneda={null}
                  sufijo=" uds."
                  nombre="Stock"
                  color="#f59e0b"
                />
              </section>
              <section className="rounded-2xl border border-[var(--borde)] p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                  Productos por reponer
                </h3>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {stockOrdenado.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex items-center gap-2.5 rounded-xl border border-[var(--borde)] px-2.5 py-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--advertencia-suave)] text-[var(--advertencia)]">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">
                          {producto.nombre}
                        </p>
                        <p className="truncate text-[10px] text-[var(--texto-tenue)]">
                          {producto.categoria || "Sin categoría"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Etiqueta
                          variante={
                            Number(producto.stock) <= 0 ? "peligro" : "advertencia"
                          }
                        >
                          {formatearNumero(producto.stock)} uds.
                        </Etiqueta>
                        <p className="mt-1 text-[10px] text-[var(--texto-tenue)]">
                          Mínimo {formatearNumero(producto.stockMinimo || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <EstadoVacio
              icono={Boxes}
              titulo="Todo tu inventario está saludable"
              descripcion="Ningún producto activo está por debajo de su stock mínimo."
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
}
