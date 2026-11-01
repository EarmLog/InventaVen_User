"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Selector from "@/components/ui/Selector";
import Alerta from "@/components/ui/Alerta";
import { actualizarVentaReportada } from "@/lib/db/repositorios";
import { TIPOS_ERROR_VENTA, TIPOS_PAGO } from "@/lib/utilidades/constantes";
import { formatearUsd, formatearVes } from "@/lib/utilidades/formato";

export default function ModalEditarPendiente({
  abierto,
  venta,
  onCerrar,
  onGuardada,
}) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [tipoPago, setTipoPago] = useState("efectivo");
  const [tipoError, setTipoError] = useState("otro");
  const [notaError, setNotaError] = useState("");
  const [notas, setNotas] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto || !venta) return;
    setClienteNombre(venta.clienteNombre || "");
    setClienteDocumento(venta.clienteDocumento || "");
    setTipoPago(venta.tipoPago || "efectivo");
    setTipoError(venta.reporte?.tipo || "otro");
    setNotaError(venta.reporte?.nota || "");
    setNotas(venta.notas || "");
    setError("");
  }, [abierto, venta]);

  if (!venta) return null;

  async function guardar() {
    setError("");
    setProcesando(true);
    try {
      await actualizarVentaReportada(venta.id, {
        clienteNombre,
        clienteDocumento,
        tipoPago,
        tipoError,
        notaError,
        notas,
      });
      toast.success("Los datos de la venta pendiente fueron actualizados.");
      onGuardada?.();
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
      titulo="Editar venta pendiente"
      descripcion={`${venta.numeroFactura} · ${formatearVes(venta.totalVes)}`}
      ancho="md"
      bloqueado={procesando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={procesando}>
            <Pencil className="h-4 w-4" />
            Guardar cambios
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3.5 py-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--texto-suave)]">Total de la venta</span>
            <strong>{formatearVes(venta.totalVes)}</strong>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-[var(--texto-tenue)]">Referencia</span>
            <span className="text-[var(--texto-tenue)]">{formatearUsd(venta.totalUsd)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Cliente">
            <Entrada
              value={clienteNombre}
              onChange={(evento) => setClienteNombre(evento.target.value)}
              maxLength={160}
              placeholder="Nombre del cliente"
            />
          </Campo>
          <Campo etiqueta="Documento o cédula">
            <Entrada
              value={clienteDocumento}
              onChange={(evento) => setClienteDocumento(evento.target.value)}
              maxLength={40}
              placeholder="Opcional"
            />
          </Campo>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Método de pago">
            <Selector
              value={tipoPago}
              onChange={(evento) => setTipoPago(evento.target.value)}
            >
              {TIPOS_PAGO.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Tipo de error">
            <Selector
              value={tipoError}
              onChange={(evento) => setTipoError(evento.target.value)}
            >
              {TIPOS_ERROR_VENTA.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </option>
              ))}
            </Selector>
          </Campo>
        </div>

        <Campo etiqueta="Descripción del error">
          <textarea
            className="campo min-h-20 resize-y"
            value={notaError}
            onChange={(evento) => setNotaError(evento.target.value)}
            maxLength={500}
            placeholder="Detalle del problema reportado."
          />
        </Campo>

        <Campo etiqueta="Notas de la venta">
          <textarea
            className="campo min-h-20 resize-y"
            value={notas}
            onChange={(evento) => setNotas(evento.target.value)}
            maxLength={500}
            placeholder="Información adicional de la venta."
          />
        </Campo>
      </div>
    </Modal>
  );
}
