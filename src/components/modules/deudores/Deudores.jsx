"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownLeft,
  CheckCheck,
  CircleDollarSign,
  Eye,
  HandCoins,
  MinusCircle,
  Pencil,
  Plus,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import EstadoVacio from "@/components/ui/EstadoVacio";
import Etiqueta from "@/components/ui/Etiqueta";
import Selector from "@/components/ui/Selector";
import Tarjeta from "@/components/ui/Tarjeta";
import { useTasa } from "@/context/TasaContext";
import {
  listarAbonos,
  listarClientes,
  listarDeudas,
  obtenerResumenDeudores,
} from "@/lib/db/repositorios";
import { ESTADOS_DEUDA, ORIGENES_DEUDA } from "@/lib/utilidades/constantes";
import {
  formatearFecha,
  formatearPorcentaje,
  formatearUsd,
  formatearVes,
  redondear,
} from "@/lib/utilidades/formato";
import ModalAbono from "./ModalAbono";
import ModalCliente from "./ModalCliente";
import ModalDetalleDeuda from "./ModalDetalleDeuda";
import ModalSaldar from "./ModalSaldar";

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

export default function Deudores() {
  const { tasa } = useTasa();
  const clientes = useLiveQuery(() => listarClientes(), [], []) || [];
  const deudas = useLiveQuery(() => listarDeudas(), [], []) || [];
  const abonos = useLiveQuery(() => listarAbonos(), [], []) || [];
  const resumen = useLiveQuery(() => obtenerResumenDeudores(), [], []) || [];

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [origen, setOrigen] = useState("todos");
  const [modalCliente, setModalCliente] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [deudaDetalle, setDeudaDetalle] = useState(null);
  const [deudaAbono, setDeudaAbono] = useState(null);
  const [deudaSaldar, setDeudaSaldar] = useState(null);

  const mapaClientes = useMemo(
    () =>
      clientes.reduce((acumulado, cliente) => {
        acumulado[cliente.id] = cliente;
        return acumulado;
      }, {}),
    [clientes]
  );

  const abonosPorDeuda = useMemo(
    () =>
      abonos.reduce((acumulado, abono) => {
        if (!abono.deudaId) return acumulado;
        if (!acumulado[abono.deudaId]) {
          acumulado[abono.deudaId] = { usd: 0, ves: 0 };
        }
        acumulado[abono.deudaId].usd += Number(abono.montoUsd) || 0;
        acumulado[abono.deudaId].ves += Number(abono.montoVes) || 0;
        return acumulado;
      }, {}),
    [abonos]
  );

  const indicadores = useMemo(() => {
    const activas = deudas.filter((deuda) => deuda.estado !== "pagada");
    return {
      deudasActivas: activas.length,
      saldoUsd: redondear(
        activas.reduce((total, deuda) => total + (Number(deuda.saldoUsd) || 0), 0)
      ),
      saldoVes: redondear(
        activas.reduce((total, deuda) => total + (Number(deuda.saldoVes) || 0), 0)
      ),
      abonadoUsd: redondear(
        abonos.reduce((total, abono) => total + (Number(abono.montoUsd) || 0), 0)
      ),
      abonadoVes: redondear(
        abonos.reduce((total, abono) => total + (Number(abono.montoVes) || 0), 0)
      ),
    };
  }, [deudas, abonos]);

  const deudoresActivos = resumen.filter((cliente) => cliente.deudasActivas > 0).length;

  const deudasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return deudas.filter((deuda) => {
      const cliente = mapaClientes[deuda.clienteId];
      const coincideTexto =
        !texto ||
        [deuda.codigo, cliente?.nombre, cliente?.documento, cliente?.telefono].some(
          (valor) => String(valor || "").toLowerCase().includes(texto)
        );
      return (
        coincideTexto &&
        (estado === "todos" || deuda.estado === estado) &&
        (origen === "todos" || deuda.origen === origen)
      );
    });
  }, [busqueda, estado, origen, deudas, mapaClientes]);

  function abrirCliente(cliente = null) {
    setClienteEditando(cliente);
    setModalCliente(true);
  }

  const tarjetas = [
    {
      etiqueta: "Deudores activos",
      valor: String(deudoresActivos),
      detalle: `${indicadores.deudasActivas} deuda${indicadores.deudasActivas === 1 ? "" : "s"} sin saldar`,
      Icono: Users,
    },
    {
      etiqueta: "Saldo total USD",
      valor: formatearUsd(indicadores.saldoUsd),
      detalle: "Pendiente por cobrar",
      Icono: CircleDollarSign,
    },
    {
      etiqueta: "Saldo total VES",
      valor: formatearVes(indicadores.saldoVes),
      detalle: "Según saldo registrado",
      Icono: Wallet,
    },
    {
      etiqueta: "Total abonado",
      valor: formatearUsd(indicadores.abonadoUsd),
      detalle: formatearVes(indicadores.abonadoVes),
      Icono: ArrowDownLeft,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ etiqueta, valor, detalle, Icono }) => (
          <Tarjeta key={etiqueta}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                  {etiqueta}
                </p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight">{valor}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--texto-tenue)]">
                  {detalle}
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primario-suave)] text-[var(--primario-fuerte)]">
                <Icono className="h-4 w-4" />
              </span>
            </div>
          </Tarjeta>
        ))}
      </div>

      <Tarjeta>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <Campo etiqueta="Buscar">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--texto-tenue)]" />
                <Entrada
                  className="pl-9"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Cliente, documento o deuda"
                />
              </div>
            </Campo>
            <Campo etiqueta="Estado">
              <Selector value={estado} onChange={(evento) => setEstado(evento.target.value)}>
                <option value="todos">Todos los estados</option>
                {ESTADOS_DEUDA.map((registro) => (
                  <option key={registro.valor} value={registro.valor}>
                    {registro.etiqueta}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Origen">
              <Selector value={origen} onChange={(evento) => setOrigen(evento.target.value)}>
                <option value="todos">Todos los orígenes</option>
                {ORIGENES_DEUDA.map((registro) => (
                  <option key={registro.valor} value={registro.valor}>
                    {registro.etiqueta}
                  </option>
                ))}
              </Selector>
            </Campo>
          </div>
          <Boton variante="exitoSuave" onClick={() => abrirCliente()}>
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Boton>
        </div>
      </Tarjeta>

      {deudasFiltradas.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            icono={HandCoins}
            titulo="No hay deudas que coincidan"
            descripcion="Registra una venta a crédito desde el punto de venta o ajusta los filtros para ver más resultados."
          />
        </Tarjeta>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-[var(--superficie-2)] text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Deuda</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Capital</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Abonado</th>
                  <th className="px-4 py-3">Comisión</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--borde)]">
                {deudasFiltradas.map((deuda) => {
                  const cliente = mapaClientes[deuda.clienteId];
                  const abonado = abonosPorDeuda[deuda.id] || { usd: 0, ves: 0 };
                  const pagada = deuda.estado === "pagada";
                  return (
                    <tr key={deuda.id} className="transition hover:bg-[var(--superficie-2)]">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{cliente?.nombre || "Cliente sin nombre"}</p>
                        <p className="text-[11px] text-[var(--texto-suave)]">
                          {cliente?.documento || cliente?.telefono || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs">{deuda.codigo}</p>
                        <p className="text-[11px] text-[var(--texto-suave)]">
                          {formatearFecha(deuda.fecha)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Etiqueta variante={deuda.origen === "cashea" ? "info" : "neutra"}>
                          {etiquetaOrigen(deuda.origen)}
                        </Etiqueta>
                      </td>
                      <td className="px-4 py-3">
                        <Etiqueta variante={varianteEstado(deuda.estado)}>
                          {etiquetaEstado(deuda.estado)}
                        </Etiqueta>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{formatearUsd(deuda.capitalUsd)}</p>
                        <p className="text-[11px] text-[var(--texto-suave)]">
                          {formatearVes(deuda.capitalVes)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[var(--primario-fuerte)]">
                          {formatearUsd(deuda.saldoUsd)}
                        </p>
                        <p className="text-[11px] text-[var(--texto-suave)]">
                          {formatearVes(deuda.saldoVes)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{formatearUsd(abonado.usd)}</p>
                        <p className="text-[11px] text-[var(--texto-suave)]">
                          {formatearVes(abonado.ves)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {deuda.origen === "cashea" ? (
                          <>
                            <p className="font-semibold">
                              {formatearPorcentaje(deuda.comisionCasheaPorcentaje)}
                            </p>
                            <p className="text-[11px] text-[var(--texto-suave)]">
                              {formatearUsd(deuda.comisionCasheaUsd)}
                            </p>
                          </>
                        ) : (
                          <span className="text-[var(--texto-tenue)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDeudaDetalle(deuda)}
                            className="rounded-lg p-1.5 text-[var(--texto-suave)] transition hover:bg-[var(--superficie-3)] hover:text-[var(--texto)]"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirCliente(cliente)}
                            disabled={!cliente}
                            className="rounded-lg p-1.5 text-[var(--texto-suave)] transition hover:bg-[var(--superficie-3)] hover:text-[var(--texto)] disabled:opacity-40"
                            title="Editar cliente"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeudaAbono(deuda)}
                            disabled={pagada}
                            className="rounded-lg p-1.5 text-[var(--primario-fuerte)] transition hover:bg-[var(--primario-suave)] disabled:opacity-40"
                            title="Restar abono"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeudaSaldar(deuda)}
                            disabled={pagada}
                            className="rounded-lg p-1.5 text-[var(--primario-fuerte)] transition hover:bg-[var(--primario-suave)] disabled:opacity-40"
                            title="Saldar deuda"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {deudasFiltradas.map((deuda) => {
              const cliente = mapaClientes[deuda.clienteId];
              const abonado = abonosPorDeuda[deuda.id] || { usd: 0, ves: 0 };
              const pagada = deuda.estado === "pagada";
              return (
                <Tarjeta key={deuda.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {cliente?.nombre || "Cliente sin nombre"}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--texto-suave)]">
                        {deuda.codigo} · {formatearFecha(deuda.fecha)}
                      </p>
                    </div>
                    <Etiqueta variante={varianteEstado(deuda.estado)}>
                      {etiquetaEstado(deuda.estado)}
                    </Etiqueta>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Etiqueta variante={deuda.origen === "cashea" ? "info" : "neutra"}>
                      {etiquetaOrigen(deuda.origen)}
                    </Etiqueta>
                    {deuda.origen === "cashea" ? (
                      <Etiqueta variante="advertencia">
                        {formatearPorcentaje(deuda.comisionCasheaPorcentaje)} comisión
                      </Etiqueta>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[var(--superficie-2)] p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                        Capital
                      </p>
                      <p className="mt-0.5 font-semibold">{formatearUsd(deuda.capitalUsd)}</p>
                      <p className="text-[10px] text-[var(--texto-tenue)]">
                        {formatearVes(deuda.capitalVes)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--primario)]/30 bg-[var(--primario-suave)] p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--primario-fuerte)]">
                        Saldo
                      </p>
                      <p className="mt-0.5 font-bold text-[var(--primario-fuerte)]">
                        {formatearUsd(deuda.saldoUsd)}
                      </p>
                      <p className="text-[10px] text-[var(--primario-fuerte)]/80">
                        {formatearVes(deuda.saldoVes)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--superficie-2)] p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                        Abonado
                      </p>
                      <p className="mt-0.5 font-semibold">{formatearUsd(abonado.usd)}</p>
                      <p className="text-[10px] text-[var(--texto-tenue)]">
                        {formatearVes(abonado.ves)}
                      </p>
                    </div>
                    {deuda.origen === "cashea" ? (
                      <div className="rounded-xl bg-[var(--superficie-2)] p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                          Comisión Cashea
                        </p>
                        <p className="mt-0.5 font-semibold">
                          {formatearUsd(deuda.comisionCasheaUsd)}
                        </p>
                        <p className="text-[10px] text-[var(--texto-tenue)]">
                          {formatearVes(deuda.comisionCasheaVes)}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[var(--superficie-2)] p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--texto-suave)]">
                          Cliente
                        </p>
                        <p className="mt-0.5 truncate font-semibold">
                          {cliente?.documento || cliente?.telefono || "—"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--borde)] pt-3">
                    <Boton
                      tamano="sm"
                      variante="secundario"
                      onClick={() => setDeudaDetalle(deuda)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detalle
                    </Boton>
                    <Boton
                      tamano="sm"
                      variante="secundario"
                      onClick={() => abrirCliente(cliente)}
                      disabled={!cliente}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Cliente
                    </Boton>
                    <Boton
                      tamano="sm"
                      variante="exitoSuave"
                      onClick={() => setDeudaAbono(deuda)}
                      disabled={pagada}
                    >
                      <MinusCircle className="h-3.5 w-3.5" />
                      Abono
                    </Boton>
                    <Boton
                      tamano="sm"
                      onClick={() => setDeudaSaldar(deuda)}
                      disabled={pagada}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Saldar
                    </Boton>
                  </div>
                </Tarjeta>
              );
            })}
          </div>
        </>
      )}

      <ModalCliente
        abierto={modalCliente}
        cliente={clienteEditando}
        onCerrar={() => setModalCliente(false)}
      />
      <ModalDetalleDeuda
        abierto={Boolean(deudaDetalle)}
        deuda={deudaDetalle}
        onCerrar={() => setDeudaDetalle(null)}
        onRegistrarAbono={(datos) => {
          setDeudaDetalle(null);
          setDeudaAbono(datos);
        }}
        onSaldar={(datos) => {
          setDeudaDetalle(null);
          setDeudaSaldar(datos);
        }}
      />
      <ModalAbono
        abierto={Boolean(deudaAbono)}
        deuda={deudaAbono}
        tasa={tasa}
        onCerrar={() => setDeudaAbono(null)}
      />
      <ModalSaldar
        abierto={Boolean(deudaSaldar)}
        deuda={deudaSaldar}
        tasa={tasa}
        onCerrar={() => setDeudaSaldar(null)}
      />
    </div>
  );
}
