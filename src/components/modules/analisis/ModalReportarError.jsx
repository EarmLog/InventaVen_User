"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Alerta from "@/components/ui/Alerta";
import { reportarErrorVenta } from "@/lib/db/repositorios";
import { TIPOS_ERROR_VENTA } from "@/lib/utilidades/constantes";
import { formatearUsd, formatearVes } from "@/lib/utilidades/formato";

export default function ModalReportarError({
  abierto,
  venta,
  onCerrar,
  onReportada,
}) {
  const [tipo, setTipo] = useState(TIPOS_ERROR_VENTA[0].valor);
  const [nota, setNota] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    setTipo(TIPOS_ERROR_VENTA[0].valor);
    setNota("");
    setError("");
  }, [abierto, venta?.id]);

  if (!venta) return null;

  async function reportar() {
    setError("");
    setProcesando(true);
    try {
      await reportarErrorVenta(venta.id, { tipo, nota });
      toast.success(`La venta ${venta.numeroFactura} se movió a Pendientes.`);
      onReportada?.();
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
      titulo="Reportar error de venta"
      descripcion={`${venta.numeroFactura} · ${formatearVes(venta.totalVes)}`}
      ancho="sm"
      bloqueado={procesando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={procesando}>
            Volver
          </Boton>
          <Boton variante="peligro" onClick={reportar} cargando={procesando}>
            <TriangleAlert className="h-4 w-4" />
            Reportar venta
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <div className="rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Monto de la venta
          </p>
          <p className="mt-0.5 text-lg font-bold">{formatearVes(venta.totalVes)}</p>
          <p className="text-[11px] text-[var(--texto-tenue)]">
            Referencia: {formatearUsd(venta.totalUsd)}
          </p>
        </div>

        <Alerta tipo="advertencia" titulo="La venta saldrá del análisis">
          El stock no se devuelve automáticamente. La venta quedará en el módulo
          Pendientes para editarla, renovarla, restablecerla o eliminarla.
        </Alerta>

        <Campo etiqueta="¿Qué ocurrió?" requerido>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIPOS_ERROR_VENTA.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setTipo(opcion.valor)}
                className={[
                  "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                  tipo === opcion.valor
                    ? "border-[var(--peligro)]/50 bg-[var(--peligro-suave)] text-[var(--peligro)]"
                    : "border-[var(--borde)] bg-[var(--superficie)] text-[var(--texto-suave)] hover:bg-[var(--superficie-2)]",
                ].join(" ")}
                aria-pressed={tipo === opcion.valor}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Nota opcional" ayuda="Máximo 500 caracteres.">
          <textarea
            className="campo min-h-24 resize-y"
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            maxLength={500}
            placeholder="Describe brevemente el problema para resolverlo después."
          />
        </Campo>
      </div>
    </Modal>
  );
}
