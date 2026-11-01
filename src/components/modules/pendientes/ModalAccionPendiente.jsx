"use client";

import { useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Alerta from "@/components/ui/Alerta";
import {
  eliminarVentaReportada,
  renovarVentaReportada,
  restablecerVentaReportada,
} from "@/lib/db/repositorios";
import { formatearVes } from "@/lib/utilidades/formato";

const ACCIONES = {
  renovar: {
    titulo: "Renovar factura",
    descripcion: "Se generará un nuevo número de factura y la venta volverá al análisis.",
    Icono: RefreshCw,
    variante: "primario",
    textoBoton: "Renovar y devolver",
    textoExito: "La venta fue renovada y devuelta al análisis.",
    advertencia:
      "El número de factura anterior quedará guardado en el historial de la venta. El stock no cambia.",
  },
  restablecer: {
    titulo: "Restablecer venta",
    descripcion: "La venta volverá al análisis conservando su número de factura.",
    Icono: CheckCircle2,
    variante: "primario",
    textoBoton: "Restablecer venta",
    textoExito: "La venta fue restablecida en el análisis.",
    advertencia:
      "Se quitará la marca de error y la factura volverá a contar en los reportes. El stock no cambia.",
  },
  eliminar: {
    titulo: "Eliminar venta pendiente",
    descripcion: "Esta acción borra definitivamente la venta reportada.",
    Icono: Trash2,
    variante: "peligro",
    textoBoton: "Eliminar definitivamente",
    textoExito: "La venta pendiente fue eliminada.",
    advertencia:
      "No se puede deshacer. El stock no se devuelve y la información de la venta se perderá.",
  },
};

export default function ModalAccionPendiente({
  abierto,
  accion,
  venta,
  onCerrar,
  onCompletada,
}) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const config = ACCIONES[accion];

  if (!venta || !config) return null;

  async function confirmar() {
    setError("");
    setProcesando(true);
    try {
      if (accion === "renovar") await renovarVentaReportada(venta.id);
      if (accion === "restablecer") await restablecerVentaReportada(venta.id);
      if (accion === "eliminar") await eliminarVentaReportada(venta.id);
      toast.success(config.textoExito);
      onCompletada?.();
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
      titulo={config.titulo}
      descripcion={`${venta.numeroFactura} · ${formatearVes(venta.totalVes)}`}
      ancho="sm"
      bloqueado={procesando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={procesando}>
            Volver
          </Boton>
          <Boton
            variante={config.variante}
            onClick={confirmar}
            cargando={procesando}
          >
            <config.Icono className="h-4 w-4" />
            {config.textoBoton}
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        <p className="text-sm text-[var(--texto-suave)]">{config.descripcion}</p>
        <Alerta
          tipo={accion === "eliminar" ? "error" : "advertencia"}
          titulo={accion === "eliminar" ? "Acción irreversible" : "Antes de continuar"}
        >
          {config.advertencia}
        </Alerta>
        <div className="flex items-start gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie-2)] px-3 py-2.5 text-xs text-[var(--texto-suave)]">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--advertencia)]" />
          <span>
            Motivo reportado: {venta.reporte?.nota || "Sin nota adicional."}
          </span>
        </div>
      </div>
    </Modal>
  );
}
