"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import Tarjeta from "@/components/ui/Tarjeta";
import Etiqueta from "@/components/ui/Etiqueta";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Auditoria() {
  const auditorias = useLiveQuery(
    () => (db ? db.auditorias.orderBy("fecha").reverse().toArray() : []),
    [],
    []
  ) || [];

  const resumen = useMemo(
    () => ({
      total: auditorias.length,
      acciones: new Set(auditorias.map((auditoria) => `${auditoria.usuarioId}:${auditoria.accion}`)).size,
      entidades: new Set(auditorias.map((auditoria) => `${auditoria.entidad}:${auditoria.entidadId || "general"}`)).size,
    }),
    [auditorias]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
            <Etiqueta variante="info">
              <ShieldCheck className="h-3 w-3" />
              {resumen.total} registros
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Registro local de acciones y entidades para auditoría por usuario.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Registros
          </p>
          <p className="mt-1 text-2xl font-bold">{resumen.total}</p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Acciones únicas
          </p>
          <p className="mt-1 text-2xl font-bold">{resumen.acciones}</p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            Entidades auditadas
          </p>
          <p className="mt-1 text-2xl font-bold">{resumen.entidades}</p>
        </Tarjeta>
      </div>

      {auditorias.length === 0 ? (
        <EstadoVacio
          icono={ShieldCheck}
          titulo="Sin registros de auditoría"
          descripcion="Todavía no hay acciones auditadas en esta base de datos local."
        />
      ) : (
        <Tarjeta className="p-4">
          <div className="space-y-2">
            {auditorias.slice(0, 20).map((auditoria) => (
              <div
                key={auditoria.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borde)] pb-2 text-[11px] last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold uppercase text-[10px] text-[var(--texto-suave)]">
                    {auditoria.accion}
                  </p>
                  <p className="text-[10px] text-[var(--texto-suave)]">
                    {auditoria.entidad}
                    {auditoria.entidadId ? ` · ${auditoria.entidadId}` : ""}
                  </p>
                  {auditoria.detalle ? (
                    <p className="mt-1 text-[10px] text-[var(--texto-suave)]">{auditoria.detalle}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase text-[var(--texto-suave)]">
                    {auditoria.usuarioId}
                  </span>
                  <span className="text-[10px] text-[var(--texto-tenue)]">{auditoria.fecha}</span>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
