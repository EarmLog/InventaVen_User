"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownLeft,
  CalendarDays,
  CheckCheck,
  MinusCircle,
  ReceiptText,
  UserRound,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Etiqueta from "@/components/ui/Etiqueta";
import { db } from "@/lib/db/baseDatos";
import {
  listarAbonos,
  obtenerCliente,
  obtenerDeuda,
} from "@/lib/db/repositorios";
import { ESTADOS_DEUDA, ORIGENES_DEUDA } from "@/lib/utilidades/constantes";
import {
  formatearFechaHora,
  formatearNumero,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  redondear,
} from "@/lib/utilidades/formato";

function etiquetaEstado(valor) {
  return ESTADOS_DEUDA.find((estado) => estado.valor === valor)?.etiqueta || "—";
}

function varianteEstado(valor) {
  if (valor === "pagada") return "exito";
  if (valor === "parcial") return "advertencia";
  return "peligro";
}

function etiquetaOrigen(valor) {
  return ORIGENES_DEUDA.find((origen) => origen.valor === valor)?.etiqueta || "—";
}

function Bloque({ titulo, icono: Icono, children }) {
  return (
    <section className="rounded-2xl border border-[var(--borde)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icono className="h-4 w-4 text-[var(--primario)]" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--texto-suave)]">
          {titulo}
        </h3>
      </div>
      {children}
    </section>
  );
}

export default function ModalDetalleDeuda({
  abierto,
  deuda,
  onCerrar,
  onRegistrarAbono,
  onSaldar,
}) {
  const deudaActual = useLiveQuery(
    () => (deuda?.id ? obtenerDeuda(deuda.id) : null),
    [deuda?.id],
    deuda
  );
  const cliente = useLiveQuery(
    () => (deuda?.clienteId ? obtenerCliente(deuda.clienteId) : null),
    [deuda?.clienteId],
    null
  );
  const venta = useLiveQuery(
    () => (db && deuda?.ventaId ? db.ventas.get(deuda.ventaId) : null),
    [deuda?.ventaId],
    null
  );
  const abonos =
    useLiveQuery(
      () => (deuda?.id ? listarAbonos(deuda.id) : []),
      [deuda?.id],
      []
    ) || [];

  const datos = deudaActual || deuda;
  const pagada = datos?.estado === "pagada";
  const totalAbonadoUsd = redondear(
    abonos.reduce((total, abono) => total + (Number(abono.montoUsd) || 0), 0)
  );

  return (
    <Modal
      abierto={abierto && Boolean(deuda)}
      onCerrar={onCerrar}
      titulo="Detalle de la deuda"
      descripcion={datos?.codigo ? `${datos.codigo} · ${formatearFechaHora(datos.fecha)}` : ""}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cerrar
          </Boton>
          <Boton
            variante="exitoSuave"
            onClick={() => onRegistrarAbono?.(datos)}
            disabled={pagada}
          >
            <MinusCircle className="h-4 w-4" />
            Restar abono
          </Boton>
          <Boton onClick={() => onSaldar?.(datos)} disabled={pagada}>
            <CheckCheck className="h-4 w-4" />
            Saldar deuda
          </Boton>
        </>
      }
    >
      {datos ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Capital
              </p>
              <p className="mt-1 text-lg font-bold">{formatearUsd(datos.capitalUsd)}</p>
              <p className="text-[11px] text-[var(--texto-suave)]">
                {formatearVes(datos.capitalVes)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--primario)]/30 bg-[var(--primario-suave)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primario-fuerte)]">
                Saldo pendiente
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--primario-fuerte)]">
                {formatearUsd(datos.saldoUsd)}
              </p>
              <p className="text-[11px] text-[var(--primario-fuerte)]/80">
                {formatearVes(datos.saldoVes)}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Total abonado
              </p>
              <p className="mt-1 text-lg font-bold">{formatearUsd(totalAbonadoUsd)}</p>
              <p className="text-[11px] text-[var(--texto-suave)]">
                {abonos.length} abono{abonos.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--superficie-2)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Origen y estado
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Etiqueta variante={datos.origen === "cashea" ? "info" : "neutra"}>
                  {etiquetaOrigen(datos.origen)}
                </Etiqueta>
                <Etiqueta variante={varianteEstado(datos.estado)}>
                  {etiquetaEstado(datos.estado)}
                </Etiqueta>
              </div>
              <p className="mt-2 text-[11px] text-[var(--texto-suave)]">
                Tasa: {formatearVes(datos.tasaUsd)}
              </p>
            </div>
          </div>

          {datos.origen === "cashea" ? (
            <div className="rounded-2xl border border-[var(--info)]/25 bg-[var(--info-suave)] px-4 py-3 text-xs text-[var(--info)]">
              <p className="font-bold">Comisión Cashea</p>
              <p className="mt-1">
                {formatearPorcentaje(datos.comisionCasheaPorcentaje)} ·{" "}
                {formatearUsd(datos.comisionCasheaUsd)} / {formatearVes(datos.comisionCasheaVes)}
              </p>
              <p className="mt-1 opacity-90">
                Neto estimado: {formatearUsd(datos.netoCasheaUsd)} ·{" "}
                {formatearVes(datos.netoCasheaVes)}
              </p>
            </div>
          ) : null}

          <Bloque titulo="Cliente" icono={UserRound}>
            <p className="text-sm font-semibold">
              {cliente?.nombre || "Cliente sin nombre"}
            </p>
            <div className="mt-2 grid gap-1.5 text-xs text-[var(--texto-suave)] sm:grid-cols-2">
              <p>{cliente?.telefono || "Sin teléfono"}</p>
              <p>{cliente?.documento || "Sin documento"}</p>
              <p className="sm:col-span-2">{cliente?.direccion || "Sin dirección"}</p>
              {cliente?.notas ? (
                <p className="sm:col-span-2">{cliente.notas}</p>
              ) : null}
            </div>
          </Bloque>

          <Bloque titulo="Venta asociada" icono={ReceiptText}>
            {venta ? (
              <div className="space-y-3">
                <div className="grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--texto-tenue)]">
                      Factura
                    </p>
                    <p className="font-semibold">{venta.numeroFactura}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--texto-tenue)]">
                      Fecha
                    </p>
                    <p className="font-semibold">{formatearFechaHora(venta.fecha)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--texto-tenue)]">
                      Total
                    </p>
                    <p className="font-semibold">
                      {formatearUsd(venta.totalUsd)} / {formatearVes(venta.totalVes)}
                    </p>
                  </div>
                </div>
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl bg-[var(--superficie-2)] p-3">
                  {(venta.items || []).map((item, indice) => (
                    <div
                      key={`${item.productoId || "item"}-${indice}`}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="min-w-0 truncate">
                        {formatearNumero(item.cantidad)} × {item.nombre}
                        {item.variante ? ` · ${item.variante}` : ""}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatearUsd(item.totalLineaUsd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--texto-suave)]">
                No se encontró la venta asociada a esta deuda.
              </p>
            )}
          </Bloque>

          <Bloque titulo="Historial de abonos" icono={ArrowDownLeft}>
            {abonos.length === 0 ? (
              <p className="text-xs text-[var(--texto-suave)]">
                Todavía no se han registrado abonos para esta deuda.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {abonos.map((abono) => (
                  <div
                    key={abono.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--borde)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {formatearFechaHora(abono.fecha)} · {abono.metodoPago}
                      </p>
                      {abono.nota ? (
                        <p className="mt-0.5 truncate text-[11px] text-[var(--texto-suave)]">
                          {abono.nota}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-[var(--primario-fuerte)]">
                        {formatearUsd(abono.montoUsd)}
                      </p>
                      <p className="text-[11px] text-[var(--texto-suave)]">
                        {formatearVes(abono.montoVes)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Bloque>

          <p className="flex items-center gap-1.5 text-[11px] text-[var(--texto-tenue)]">
            <CalendarDays className="h-3.5 w-3.5" />
            Registrada el {formatearFechaHora(datos.creadoEn || datos.fecha)}
            {datos.fechaUltimoAbono
              ? ` · Último abono: ${formatearFechaHora(datos.fechaUltimoAbono)}`
              : ""}
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
