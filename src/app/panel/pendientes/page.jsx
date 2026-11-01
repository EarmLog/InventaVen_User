"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import Tarjeta from "@/components/ui/Tarjeta";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";
import Boton from "@/components/ui/Boton";
import ModalFactura from "@/components/modules/pos/ModalFactura";
import ModalEditarPendiente from "@/components/modules/pendientes/ModalEditarPendiente";
import ModalAccionPendiente from "@/components/modules/pendientes/ModalAccionPendiente";
import { useSesion } from "@/context/SesionContext";
import { TIPOS_ERROR_VENTA } from "@/lib/utilidades/constantes";
import {
  etiquetaTipoError,
  esVentaReportada,
} from "@/lib/utilidades/ventas";
import {
  fechaParaInput,
  formatearFechaHora,
  formatearNumero,
  formatearUsd,
  formatearVes,
  redondear,
} from "@/lib/utilidades/formato";

function Indicador({ Icono, etiqueta, valor, detalle, tono = "ambar" }) {
  const tonos = {
    ambar: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
    rojo: "bg-[var(--peligro-suave)] text-[var(--peligro)]",
    azul: "bg-[var(--info-suave)] text-[var(--info)]",
    verde: "bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
  };
  return (
    <Tarjeta className="flex items-center gap-3 p-4">
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tonos[tono] || tonos.ambar,
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

export default function PaginaPendientes() {
  const { perfil } = useSesion();
  const ventas =
    useLiveQuery(
      () => (db ? db.ventas.orderBy("fecha").reverse().toArray() : []),
      [],
      []
    ) || [];
  const [busqueda, setBusqueda] = useState("");
  const [tipoError, setTipoError] = useState("todos");
  const [factura, setFactura] = useState(null);
  const [ventaEditar, setVentaEditar] = useState(null);
  const [accion, setAccion] = useState(null);
  const [ventaAccion, setVentaAccion] = useState(null);

  const pendientes = useMemo(
    () => ventas.filter(esVentaReportada),
    [ventas]
  );

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return pendientes.filter((venta) => {
      const coincideTipo =
        tipoError === "todos" || venta.reporte?.tipo === tipoError;
      const coincideBusqueda =
        !termino ||
        venta.numeroFactura?.toLowerCase().includes(termino) ||
        venta.clienteNombre?.toLowerCase().includes(termino) ||
        venta.clienteDocumento?.toLowerCase().includes(termino) ||
        venta.reporte?.nota?.toLowerCase().includes(termino) ||
        (venta.items || []).some(
          (item) =>
            item.nombre?.toLowerCase().includes(termino) ||
            item.sku?.toLowerCase().includes(termino)
        );
      return coincideTipo && coincideBusqueda;
    });
  }, [pendientes, busqueda, tipoError]);

  const resumen = useMemo(() => {
    const totalVes = redondear(
      pendientes.reduce((total, venta) => total + Number(venta.totalVes || 0), 0)
    );
    const totalUsd = redondear(
      pendientes.reduce((total, venta) => total + Number(venta.totalUsd || 0), 0)
    );
    const conteo = new Map();
    pendientes.forEach((venta) => {
      const tipo = venta.reporte?.tipo || "otro";
      conteo.set(tipo, (conteo.get(tipo) || 0) + 1);
    });
    const tipoFrecuente = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
    const hoy = fechaParaInput(new Date());
    const reportadasHoy = pendientes.filter(
      (venta) => fechaParaInput(venta.reporte?.reportadaEn) === hoy
    ).length;
    return {
      totalVes,
      totalUsd,
      tipoFrecuente,
      reportadasHoy,
    };
  }, [pendientes]);

  function abrirAccion(venta, tipoAccion) {
    setVentaAccion(venta);
    setAccion(tipoAccion);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Ventas pendientes</h1>
            <Etiqueta variante={pendientes.length ? "advertencia" : "exito"}>
              {pendientes.length} {pendientes.length === 1 ? "caso" : "casos"}
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Ventas reportadas con error que no cuentan en el análisis hasta resolverlas.
          </p>
        </div>
        <Link
          href="/panel/analisis"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
        >
          <BarChart3 className="h-4 w-4" />
          Ir al análisis
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          Icono={TriangleAlert}
          etiqueta="Casos pendientes"
          valor={formatearNumero(pendientes.length)}
          detalle="Requieren revisión"
          tono={pendientes.length ? "ambar" : "verde"}
        />
        <Indicador
          Icono={RefreshCw}
          etiqueta="Monto en espera"
          valor={formatearVes(resumen.totalVes)}
          detalle={`Referencia: ${formatearUsd(resumen.totalUsd)}`}
          tono="rojo"
        />
        <Indicador
          Icono={TriangleAlert}
          etiqueta="Error más frecuente"
          valor={
            resumen.tipoFrecuente
              ? etiquetaTipoError(resumen.tipoFrecuente[0])
              : "Sin casos"
          }
          detalle={
            resumen.tipoFrecuente
              ? `${resumen.tipoFrecuente[1]} reporte(s)`
              : "Todo al día"
          }
          tono="azul"
        />
        <Indicador
          Icono={CheckCircle2}
          etiqueta="Reportadas hoy"
          valor={formatearNumero(resumen.reportadasHoy)}
          detalle="Nuevos casos del día"
          tono="verde"
        />
      </div>

      <Tarjeta className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-[var(--borde)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold">Bandeja de pendientes</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              Edita, renueva, restablece o elimina cada venta reportada.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
              <Entrada
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar factura, cliente, producto..."
                className="pl-9 sm:w-64"
              />
            </div>
            <Selector
              value={tipoError}
              onChange={(evento) => setTipoError(evento.target.value)}
              className="sm:w-48"
            >
              <option value="todos">Todos los errores</option>
              {TIPOS_ERROR_VENTA.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </option>
              ))}
            </Selector>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <EstadoVacio
            icono={CheckCircle2}
            titulo={pendientes.length ? "Sin coincidencias" : "No hay ventas pendientes"}
            descripcion={
              pendientes.length
                ? "Prueba con otro término de búsqueda o tipo de error."
                : "Las ventas que reportes con error aparecerán en esta bandeja."
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="bg-[var(--superficie-2)] text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Factura</th>
                    <th className="px-4 py-3 font-semibold">Reporte</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Motivo</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borde)]">
                  {filtradas.map((venta) => (
                    <tr key={venta.id} className="align-top hover:bg-[var(--superficie-2)]/60">
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold">{venta.numeroFactura}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--texto-tenue)]">
                          Venta: {formatearFechaHora(venta.fecha)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {etiquetaTipoError(venta.reporte?.tipo)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--texto-tenue)]">
                          {formatearFechaHora(venta.reporte?.reportadaEn)}
                        </p>
                      </td>
                      <td className="max-w-[150px] px-4 py-3">
                        <p className="truncate font-medium">
                          {venta.clienteNombre || "Cliente ocasional"}
                        </p>
                        <p className="truncate text-[10px] text-[var(--texto-tenue)]">
                          {venta.clienteDocumento || "Sin documento"}
                        </p>
                      </td>
                      <td className="max-w-[210px] px-4 py-3">
                        <p className="line-clamp-2 text-[var(--texto-suave)]">
                          {venta.reporte?.nota || "Sin nota adicional."}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <p className="font-bold">{formatearVes(venta.totalVes)}</p>
                        <p className="text-[10px] text-[var(--texto-tenue)]">
                          {formatearUsd(venta.totalUsd)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-0.5">
                          <Boton
                            variante="fantasma"
                            tamano="icono"
                            title="Ver factura"
                            onClick={() => setFactura(venta)}
                          >
                            <Eye className="h-4 w-4" />
                          </Boton>
                          <Boton
                            variante="fantasma"
                            tamano="icono"
                            title="Editar venta"
                            onClick={() => setVentaEditar(venta)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Boton>
                          <Boton
                            variante="fantasma"
                            tamano="icono"
                            title="Renovar factura"
                            onClick={() => abrirAccion(venta, "renovar")}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Boton>
                          <Boton
                            variante="fantasma"
                            tamano="icono"
                            title="Restablecer venta"
                            onClick={() => abrirAccion(venta, "restablecer")}
                          >
                            <CheckCircle2 className="h-4 w-4 text-[var(--primario)]" />
                          </Boton>
                          <Boton
                            variante="fantasma"
                            tamano="icono"
                            title="Eliminar venta"
                            onClick={() => abrirAccion(venta, "eliminar")}
                          >
                            <Trash2 className="h-4 w-4 text-[var(--peligro)]" />
                          </Boton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--borde)] md:hidden">
              {filtradas.map((venta) => (
                <div key={venta.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold">
                        {venta.numeroFactura}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--texto-tenue)]">
                        Reportada: {formatearFechaHora(venta.reporte?.reportadaEn)}
                      </p>
                    </div>
                    <Etiqueta variante="advertencia">
                      {etiquetaTipoError(venta.reporte?.tipo)}
                    </Etiqueta>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {venta.clienteNombre || "Cliente ocasional"}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-[var(--texto-suave)]">
                        {venta.reporte?.nota || "Sin nota adicional."}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">{formatearVes(venta.totalVes)}</p>
                      <p className="text-[10px] text-[var(--texto-tenue)]">
                        {formatearUsd(venta.totalUsd)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => setFactura(venta)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Boton>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => setVentaEditar(venta)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Boton>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => abrirAccion(venta, "renovar")}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Renovar
                    </Boton>
                    <Boton
                      variante="exitoSuave"
                      tamano="sm"
                      onClick={() => abrirAccion(venta, "restablecer")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Restablecer
                    </Boton>
                    <Boton
                      variante="peligroSuave"
                      tamano="sm"
                      onClick={() => abrirAccion(venta, "eliminar")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Boton>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Tarjeta>

      <ModalFactura
        abierto={Boolean(factura)}
        venta={factura}
        perfil={perfil}
        onCerrar={() => setFactura(null)}
      />
      <ModalEditarPendiente
        abierto={Boolean(ventaEditar)}
        venta={ventaEditar}
        onCerrar={() => setVentaEditar(null)}
      />
      <ModalAccionPendiente
        abierto={Boolean(ventaAccion && accion)}
        accion={accion}
        venta={ventaAccion}
        onCerrar={() => {
          setVentaAccion(null);
          setAccion(null);
        }}
      />
    </div>
  );
}
