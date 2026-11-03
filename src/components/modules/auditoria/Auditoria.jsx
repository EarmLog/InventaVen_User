"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ShieldCheck, Search, Trash2, Calendar } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { toast } from "sonner";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Auditoria() {
  const auditorias = useLiveQuery(() => (db ? db.auditorias.orderBy("fecha").reverse().toArray() : []), [], []) || [];

  const limpiarAuditoria = async () => {
    if (!confirm("¿Deseas limpiar el registro de auditoría local?")) return;
    try {
      await db.auditorias.clear();
      toast.success("Registro de auditoría limpiado.");
    } catch (error) {
      console.error(error);
      toast.error("Error al limpiar auditoría.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--texto-suave)]">
          Registro cronológico de operaciones y eventos de seguridad locales en este equipo.
        </p>
        {auditorias.length > 0 && (
          <Boton onClick={limpiarAuditoria} variante="secundario" className="inline-flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Limpiar registro
          </Boton>
        )}
      </div>

      {auditorias.length === 0 ? (
        <EstadoVacio
          icono={ShieldCheck}
          titulo="Sin registros de auditoría"
          descripcion="Las acciones importantes de venta, inventario y seguridad quedarán registradas aquí."
        />
      ) : (
        <Tarjeta className="p-4">
          <div className="space-y-3">
            {auditorias.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--borde)] pb-3 text-xs last:border-b-0 last:pb-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--primario-fuerte)] uppercase tracking-wider text-[10px] bg-[var(--primario-suave)] px-2 py-0.5 rounded-full">
                      {item.accion || "EVENTO"}
                    </span>
                    <span className="text-[var(--texto-suave)] text-[11px]">{item.entidad || "Sistema"}</span>
                  </div>
                  <p className="mt-1 font-medium">{item.detalle || "Sin detalles adicionales"}</p>
                </div>
                <div className="text-[10px] text-[var(--texto-tenue)] flex items-center gap-1 sm:text-right">
                  <Calendar className="h-3 w-3" />
                  {item.fecha ? new Date(item.fecha).toLocaleString() : "Fecha no registrada"}
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
