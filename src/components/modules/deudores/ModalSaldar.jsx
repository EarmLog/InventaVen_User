"use client";

import { useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Alerta from "@/components/ui/Alerta";
import { registrarAbono } from "@/lib/db/repositorios";
import { TIPOS_PAGO } from "@/lib/utilidades/constantes";
import { formatearUsd, formatearVes, redondear } from "@/lib/utilidades/formato";

export default function ModalSaldar({ abierto, deuda, tasa, onCerrar, onGuardado }) {
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [nota, setNota] = useState("Deuda saldada");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const tasaUsada = Number(tasa) || 0;
  const saldoUsd = redondear(Number(deuda?.saldoUsd) || 0);
  const saldoVes = redondear(Number(deuda?.saldoVes) || 0);
  const equivalenteVes = redondear(saldoUsd * tasaUsada);
  const difiereVes = Math.abs(equivalenteVes - saldoVes) > 0.01;

  useEffect(() => {
    if (!abierto) return;
    setMetodoPago("efectivo");
    setNota("Deuda saldada");
    setError("");
  }, [abierto]);

  async function saldar() {
    setError("");
    if (tasaUsada <= 0) {
      setError("Necesitas una tasa del dólar válida para saldar la deuda.");
      return;
    }
    if (saldoUsd <= 0) {
      setError("Esta deuda no tiene saldo pendiente.");
      return;
    }
    setGuardando(true);
    try {
      await registrarAbono({
        deudaId: deuda.id,
        monto: saldoUsd,
        moneda: "USD",
        metodoPago,
        tasaUsd: tasaUsada,
        nota,
      });
      toast.success("Deuda saldada correctamente.");
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
      titulo="Saldar deuda"
      descripcion={deuda?.codigo ? `Deuda ${deuda.codigo}` : ""}
      ancho="md"
      bloqueado={guardando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton onClick={saldar} cargando={guardando}>
            <CheckCheck className="h-4 w-4" />
            Saldar {formatearUsd(saldoUsd)}
          </Boton>
        </>
      }
    >
      {deuda ? (
        <div className="space-y-4">
          {error ? <Alerta tipo="error">{error}</Alerta> : null}

          <div className="rounded-2xl border border-[var(--primario)]/30 bg-[var(--primario-suave)] p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primario-fuerte)]">
              Saldo exacto a registrar
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--primario-fuerte)]">
              {formatearUsd(saldoUsd)}
            </p>
            <p className="mt-1 text-xs text-[var(--primario-fuerte)]/80">
              {formatearVes(saldoVes)} registrados en la deuda
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
            <Campo etiqueta="Nota">
              <Entrada
                value={nota}
                onChange={(evento) => setNota(evento.target.value)}
                maxLength={300}
              />
            </Campo>
          </div>

          <Alerta tipo="info">
            Se registrará un abono en USD por el saldo exacto con la tasa actual de{" "}
            {formatearVes(tasaUsada)} ({formatearVes(equivalenteVes)}).
            {difiereVes
              ? " El saldo en bolívares difiere del equivalente, por eso la operación se hace en dólares."
              : ""}
          </Alerta>
        </div>
      ) : null}
    </Modal>
  );
}
