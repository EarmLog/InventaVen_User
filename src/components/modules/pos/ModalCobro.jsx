"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Banknote,
  CreditCard,
  Fingerprint,
  HandCoins,
  ReceiptText,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Interruptor from "@/components/ui/Interruptor";
import Alerta from "@/components/ui/Alerta";
import { db } from "@/lib/db/baseDatos";
import { registrarVenta } from "@/lib/db/repositorios";
import {
  CLAVES_AJUSTES,
  ORIGENES_DEUDA,
  TIPOS_PAGO,
} from "@/lib/utilidades/constantes";
import { formatearUsd, formatearVes, limpiarNumero, redondear } from "@/lib/utilidades/formato";

const ICONOS = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  biopago: Fingerprint,
  pagomovil: Smartphone,
  deuda: HandCoins,
};

export default function ModalCobro({
  abierto,
  items,
  totales,
  tasa,
  aplicarIva,
  porcentajeIva,
  onCambiarIva,
  onCerrar,
  onVenta,
}) {
  const [tipoPago, setTipoPago] = useState("efectivo");
  const [moneda, setMoneda] = useState("VES");
  const [monto, setMonto] = useState("");
  const [origenCredito, setOrigenCredito] = useState("fiado");
  const [clienteId, setClienteId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteNotas, setClienteNotas] = useState("");
  const [notas, setNotas] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const ajusteDeuda = useLiveQuery(
    () => (db ? db.ajustes.get(CLAVES_AJUSTES.METODO_DEUDA_ACTIVO) : null),
    [],
    null
  );
  const clientes = useLiveQuery(
    () => (db ? db.clientes.orderBy("nombre").toArray() : []),
    [],
    []
  );
  const metodoDeudaActivo =
    ajusteDeuda?.valor === true || ajusteDeuda?.valor === "true";
  const esDeuda = tipoPago === "deuda";
  const esEfectivo = tipoPago === "efectivo";
  const tasaUsada = Number(tasa) || 0;
  const tiposDisponibles = TIPOS_PAGO.filter((tipo) =>
    tipo.valor === "deuda" ? metodoDeudaActivo : !tipo.oculto
  );
  const origenEtiqueta =
    ORIGENES_DEUDA.find((origen) => origen.valor === origenCredito)?.etiqueta ||
    "Fiado";

  useEffect(() => {
    if (!abierto) return;
    setTipoPago("efectivo");
    setMoneda("VES");
    setOrigenCredito("fiado");
    setClienteId("");
    setClienteNombre("");
    setClienteTelefono("");
    setClienteDocumento("");
    setClienteDireccion("");
    setClienteNotas("");
    setNotas("");
    setError("");
  }, [abierto]);

  useEffect(() => {
    if (!abierto || metodoDeudaActivo || tipoPago !== "deuda") return;
    setTipoPago("efectivo");
  }, [abierto, metodoDeudaActivo, tipoPago]);

  useEffect(() => {
    if (!abierto) return;
    setMonto(String(redondear(totales.totalVes)));
  }, [abierto, totales.totalVes]);

  const recibidoVes = useMemo(() => {
    const valor = limpiarNumero(monto, 0);
    if (!esEfectivo) return totales.totalVes;
    return moneda === "USD" ? redondear(valor * tasaUsada) : redondear(valor);
  }, [monto, moneda, tasaUsada, esEfectivo, totales.totalVes]);

  const vueltoVes = redondear(recibidoVes - totales.totalVes);
  const faltante = esEfectivo && vueltoVes < 0;

  function seleccionarCliente(id) {
    setClienteId(id);
    const cliente = clientes.find((registro) => registro.id === id);
    setClienteNombre(cliente?.nombre || "");
    setClienteTelefono(cliente?.telefono || "");
    setClienteDocumento(cliente?.documento || "");
    setClienteDireccion(cliente?.direccion || "");
    setClienteNotas(cliente?.notas || "");
  }

  async function cobrar() {
    setError("");
    if (!items.length) {
      setError("El carrito está vacío.");
      return;
    }
    if (esEfectivo && tasaUsada <= 0) {
      setError("No hay una tasa del dólar disponible para procesar el pago en efectivo.");
      return;
    }
    if (esEfectivo && faltante) {
      setError("El monto recibido es menor al total de la venta.");
      return;
    }
    if (esDeuda && !clienteNombre.trim()) {
      setError("El nombre del cliente es obligatorio para registrar la deuda.");
      return;
    }
    setProcesando(true);
    try {
      const venta = await registrarVenta({
        items,
        tipoPago,
        clienteNombre,
        clienteDocumento,
        notas,
        tasaUsd: tasaUsada,
        montoRecibidoVes: esDeuda ? 0 : esEfectivo ? recibidoVes : totales.totalVes,
        aplicarIva,
        porcentajeIva,
        clienteId: esDeuda ? clienteId || null : null,
        cliente: esDeuda
          ? {
              ...(clienteId ? { id: clienteId } : {}),
              nombre: clienteNombre,
              telefono: clienteTelefono,
              documento: clienteDocumento,
              direccion: clienteDireccion,
              notas: clienteNotas,
            }
          : null,
        esCredito: esDeuda,
        origenCredito: esDeuda ? origenCredito : "fiado",
      });
      toast.success(
        esDeuda
          ? `Deuda ${venta.numeroFactura} registrada.`
          : `Venta ${venta.numeroFactura} registrada.`
      );
      onVenta?.(venta);
      onCerrar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Cobrar venta"
      descripcion={`${items.length} línea${items.length === 1 ? "" : "s"} en el carrito`}
      ancho="lg"
      bloqueado={procesando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={procesando}>
            Volver al carrito
          </Boton>
          <Boton onClick={cobrar} cargando={procesando}>
            {esDeuda ? (
              <HandCoins className="h-4 w-4" />
            ) : (
              <ReceiptText className="h-4 w-4" />
            )}
            {esDeuda ? "Confirmar deuda" : "Confirmar cobro"} ·{" "}
            {formatearVes(totales.totalVes)}
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <div className="rounded-2xl border border-[var(--primario)]/30 bg-[var(--primario-suave)] px-4 py-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primario-fuerte)]">
                Total a cobrar
              </p>
              <p className="text-3xl font-bold tracking-tight text-[var(--primario-fuerte)]">
                {formatearVes(totales.totalVes)}
              </p>
            </div>
            <p className="text-sm font-semibold text-[var(--primario-fuerte)]">
              {formatearUsd(totales.totalUsd)}
            </p>
          </div>
          {totales.descuentoVes > 0 ? (
            <p className="mt-1 text-[10px] text-[var(--primario-fuerte)]/80">
              Incluye {formatearVes(totales.descuentoVes)} de descuento por ofertas.
            </p>
          ) : null}
          {aplicarIva ? (
            <p className="mt-1 text-[10px] text-[var(--primario-fuerte)]/80">
              Base {formatearVes(totales.baseVes)} + IVA {formatearVes(totales.ivaVes)}
            </p>
          ) : null}
          {esDeuda ? (
            <div className="mt-2 flex items-start gap-2 border-t border-[var(--primario)]/20 pt-2">
              <HandCoins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="text-[11px] font-semibold leading-relaxed text-[var(--primario-fuerte)]">
                El total quedará como deuda ({origenEtiqueta}) y podrás cobrarlo
                desde Deudas/Pendientes.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--borde)] px-4 py-3">
          <Interruptor
            activo={aplicarIva}
            onCambio={onCambiarIva}
            etiqueta={`Aplicar IVA (${porcentajeIva}%)`}
            descripcion="Se suma automáticamente al total antes de confirmar el cobro."
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Método de pago
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiposDisponibles.map((tipo) => {
              const Icono = ICONOS[tipo.valor] || Banknote;
              const activo = tipoPago === tipo.valor;
              return (
                <button
                  key={tipo.valor}
                  type="button"
                  onClick={() => setTipoPago(tipo.valor)}
                  className={[
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition",
                    activo
                      ? "border-[var(--primario)] bg-[var(--primario-suave)] text-[var(--primario-fuerte)]"
                      : "border-[var(--borde)] bg-[var(--superficie)] text-[var(--texto-suave)] hover:bg-[var(--superficie-2)]",
                  ].join(" ")}
                >
                  <Icono className="h-5 w-5" />
                  {tipo.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        {esEfectivo ? (
          <div className="rounded-2xl border border-[var(--borde)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                Monto recibido
              </p>
              <Selector
                className="w-auto py-1 text-xs"
                value={moneda}
                onChange={(evento) => setMoneda(evento.target.value)}
              >
                <option value="VES">Bolívares</option>
                <option value="USD">Dólares</option>
              </Selector>
            </div>
            <div className="mt-2 flex gap-2">
              <Entrada
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value)}
                className="text-lg font-bold"
              />
              <Boton
                variante="secundario"
                onClick={() =>
                  setMonto(
                    String(
                      moneda === "USD"
                        ? redondear(totales.totalUsd)
                        : redondear(totales.totalVes)
                    )
                  )
                }
              >
                Exacto
              </Boton>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-[var(--texto-suave)]">
                Equivale a {formatearUsd(recibidoVes / (tasaUsada || 1))}
              </span>
              <span
                className={
                  faltante
                    ? "font-bold text-[var(--peligro)]"
                    : "font-bold text-[var(--primario-fuerte)]"
                }
              >
                {faltante ? "Falta" : "Vuelto"} {formatearVes(Math.abs(vueltoVes))}
              </span>
            </div>
          </div>
        ) : esDeuda ? (
          <Alerta tipo="advertencia">
            Se registrará {formatearVes(totales.totalVes)} como deuda por {origenEtiqueta}.
            No se solicita monto recibido ni vuelto; el stock se descontará al confirmar.
          </Alerta>
        ) : (
          <Alerta tipo="info">
            Confirma el cobro por {formatearVes(totales.totalVes)} mediante{" "}
            {TIPOS_PAGO.find((tipo) => tipo.valor === tipoPago)?.etiqueta}. El stock se
            descontará al confirmar.
          </Alerta>
        )}

        {esDeuda ? (
          <div className="space-y-3 rounded-2xl border border-[var(--borde)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Origen de la deuda" requerido>
                <Selector
                  value={origenCredito}
                  onChange={(evento) => setOrigenCredito(evento.target.value)}
                >
                  {ORIGENES_DEUDA.map((origen) => (
                    <option key={origen.valor} value={origen.valor}>
                      {origen.etiqueta}
                    </option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Cliente" requerido>
                <Selector
                  value={clienteId}
                  onChange={(evento) => seleccionarCliente(evento.target.value)}
                >
                  <option value="">Nuevo cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                      {cliente.documento ? ` · ${cliente.documento}` : ""}
                    </option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Nombre del cliente" requerido>
                <Entrada
                  value={clienteNombre}
                  onChange={(evento) => setClienteNombre(evento.target.value)}
                  placeholder="Nombre o razón social"
                  maxLength={160}
                />
              </Campo>
              <Campo etiqueta="Teléfono">
                <Entrada
                  value={clienteTelefono}
                  onChange={(evento) => setClienteTelefono(evento.target.value)}
                  placeholder="0414-1234567"
                  maxLength={40}
                />
              </Campo>
              <Campo etiqueta="Cédula / RIF">
                <Entrada
                  value={clienteDocumento}
                  onChange={(evento) => setClienteDocumento(evento.target.value)}
                  placeholder="V-12345678"
                  maxLength={40}
                />
              </Campo>
              <Campo etiqueta="Dirección" className="sm:col-span-2">
                <Entrada
                  value={clienteDireccion}
                  onChange={(evento) => setClienteDireccion(evento.target.value)}
                  placeholder="Dirección del cliente"
                  maxLength={200}
                />
              </Campo>
              <Campo etiqueta="Notas del cliente" className="sm:col-span-2">
                <textarea
                  className="campo min-h-16 resize-y"
                  value={clienteNotas}
                  onChange={(evento) => setClienteNotas(evento.target.value)}
                  placeholder="Referencias, contacto, observaciones..."
                  maxLength={500}
                />
              </Campo>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Cliente (opcional)">
              <Entrada
                value={clienteNombre}
                onChange={(evento) => setClienteNombre(evento.target.value)}
                placeholder="Nombre o razón social"
                maxLength={160}
              />
            </Campo>
            <Campo etiqueta="Cédula / RIF (opcional)">
              <Entrada
                value={clienteDocumento}
                onChange={(evento) => setClienteDocumento(evento.target.value)}
                placeholder="V-12345678"
                maxLength={40}
              />
            </Campo>
          </div>
        )}

        <Campo etiqueta="Notas de la venta (opcional)">
          <textarea
            className="campo min-h-20 resize-y"
            value={notas}
            onChange={(evento) => setNotas(evento.target.value)}
            maxLength={500}
            placeholder="Referencia, observaciones del pago..."
          />
        </Campo>
      </div>
    </Modal>
  );
}
