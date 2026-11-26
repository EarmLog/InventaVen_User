"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Alerta from "@/components/ui/Alerta";
import { registrarAbono } from "@/lib/db/repositorios";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import {
  formatearUsd,
  formatearVes,
  hoyParaInput,
  limpiarNumero,
  redondear,
} from "@/lib/utilidades/formato";

export default function ModalAbono({ abierto, deuda, tasa, onCerrar, onGuardado }) {
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("VES");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [fecha, setFecha] = useState(hoyParaInput());
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const tasaUsada = Number(tasa) || 0;
  const saldoUsd = redondear(Number(deuda?.saldoUsd) || 0);
  const saldoVes = redondear(Number(deuda?.saldoVes) || 0);
  const montoNumero = Math.max(0, limpiarNumero(monto, 0));
  const equivalenteUsd =
    moneda === "USD"
      ? redondear(montoNumero)
      : tasaUsada > 0
        ? redondear(montoNumero / tasaUsada)
        : 0;
  const equivalenteVes =
    moneda === "VES" ? redondear(montoNumero) : redondear(montoNumero * tasaUsada);

  useEffect(() => {
    if (!abierto) return;
    setMonto("");
    setMoneda("VES");
    setMetodoPago("efectivo");
    setFecha(hoyParaInput());
    setNota("");
    setError("");
  }, [abierto]);

  async function guardar() {
    setError("");
    if (tasaUsada <= 0) {
      setError("Necesitas una tasa del dólar válida para registrar el abono.");
      return;
    }
    if (montoNumero <= 0) {
      setError("El monto del abono debe ser mayor a cero.");
      return;
    }
    if (equivalenteUsd > saldoUsd + 0.01) {
      setError("El abono supera el saldo pendiente de la deuda.");
      return;
    }

    let fechaISO = new Date().toISOString();
    if (fecha) {
      const fechaLocal = new Date(`${fecha}T12:00:00`);
      if (!Number.isNaN(fechaLocal.getTime())) fechaISO = fechaLocal.toISOString();
    }

    setGuardando(true);
    try {
      await registrarAbono({
        deudaId: deuda.id,
        monto: montoNumero,
        moneda,
        metodoPago,
        tasaUsd: tasaUsada,
        fecha: fechaISO,
        nota,
      });
      toast.success("Abono registrado correctamente.");
      onGuardado?.();
      onCerrar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto && Boolean(deuda)}
      onCerrar={onCerrar}
      titulo="Restar abono"
      descripcion={deuda?.codigo ? `${deuda.codigo} · ${formatearUsd(saldoUsd)} pendientes` : ""}
      ancho="md"
      bloqueado={guardando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            <ArrowDownLeft className="h-4 w-4" />
            Registrar abono
          </Boton>
        </>
      }
    >
      {deuda ? (
        <div className="space-y-4">
          {error ? <Alerta tipo="error">{error}</Alerta> : null}

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--primario)]/30 bg-[var(--primario-suave)] p-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--primario-fuerte)]">
                Saldo USD
              </p>
              <p className="text-lg font-bold text-[var(--primario-fuerte)]">
                {formatearUsd(saldoUsd)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--primario-fuerte)]">
                Saldo VES
              </p>
              <p className="text-lg font-bold text-[var(--primario-fuerte)]">
                {formatearVes(saldoVes)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Monto del abono" requerido>
              <Entrada
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </Campo>
            <Campo etiqueta="Moneda" requerido>
              <Selector
                value={moneda}
                onChange={(evento) => setMoneda(evento.target.value)}
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </Selector>
            </Campo>
            <Campo etiqueta="Método de pago">
              <Selector
                value={metodoPago}
                onChange={(evento) => setMetodoPago(evento.target.value)}
              >
                {TIPOS_PAGO.filter((tipo) => !tipo.oculto).map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.etiqueta}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Fecha">
              <Entrada
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="Nota (opcional)" className="sm:col-span-2">
              <Entrada
                value={nota}
                onChange={(evento) => setNota(evento.target.value)}
                placeholder="Referencia del pago"
                maxLength={300}
              />
            </Campo>
          </div>

          {montoNumero > 0 ? (
            <Alerta tipo="info">
              Equivale a {formatearUsd(equivalenteUsd)} /{" "}
              {formatearVes(equivalenteVes)} con la tasa actual de{" "}
              {formatearVes(tasaUsada)}.
            </Alerta>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
