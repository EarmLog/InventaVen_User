"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ShieldCheck, Search, Trash2, Calendar, Plus } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { eliminarCaja, listarCajas, registrarCaja } from "@/lib/db/repositorios";
import { generarId } from "@/lib/utilidades/formato";
import { toast } from "sonner";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Auditoria() {
  const auditorias = useLiveQuery(() => (db ? db.auditorias.orderBy("fecha").reverse().toArray() : []), [], []) || [];
  const cajas = useLiveQuery(() => (db ? db.cajas.toArray() : []), [], []) || [];
  const [modalCajaAbierta, setModalCajaAbierta] = useState(false);
  const [cajaEditando, setCajaEditando] = useState(null);
  const [cajaNombre, setCajaNombre] = useState("");
  const [cajaCodigo, setCajaCodigo] = useState("");
  const [cajaContrasena, setCajaContrasena] = useState("");
  const [cajaEstado, setCajaEstado] = useState("activa");

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

  const crearCaja = async () => {
    try {
      const existentes = await listarCajas();
      const secuencial = `Caja${existentes.length + 1}`;
      await registrarCaja({
        nombre: secuencial,
        codigo: generarId(),
        contrasena: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        estado: "activa",
        creador: "local",
      });
      toast.success(`Caja ${secuencial} creada.`);
      setModalCajaAbierta(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al crear la caja.");
    }
  };

  const cerrarCaja = async (id) => {
    try {
      const cajasActuales = await listarCajas();
      const caja = cajasActuales.find((item) => item.id === id);
      if (!caja) return;
      await db.cajas.put({
        ...caja,
        estado: "cerrada",
        fechaCierre: new Date().toISOString(),
      });
      toast.success(`Caja ${caja.nombre} sellada.`);
    } catch (error) {
      console.error(error);
      toast.error("Error al sellar la caja.");
    }
  };

  const eliminarCajaHandler = async (id) => {
    try {
      await eliminarCaja(id);
      toast.success("Caja eliminada.");
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar la caja.");
    }
  };

  return (
    <div className="space-y-4">
      <Tarjeta className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Cajas / Sub‑máquinas</h2>
          <Boton onClick={crearCaja} variante="primario" className="inline-flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Nueva caja
          </Boton>
        </div>
        {cajas.length === 0 ? (
          <EstadoVacio
            icono={ShieldCheck}
            titulo="Sin cajas registradas"
            descripcion="Crea una caja temporal para delegar el POS, inventario o análisis."
          />
        ) : (
          <div className="space-y-2">
            {cajas.map((caja) => (
              <div
                key={caja.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borde)] pb-2 text-xs last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-bold">{caja.nombre}</p>
                  <p className="text-[10px] text-[var(--texto-suave)]">{caja.codigo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Boton variante="secundario" onClick={() => cerrarCaja(caja.id)}>
                    Serrear
                  </Boton>
                  <Boton variante="secundario" onClick={() => toast.info("Revisión de caja en desarrollo.")}>
                    Revisar
                  </Boton>
                  <Boton variante="peligro" onClick={() => eliminarCajaHandler(caja.id)}>
                    Eliminar
                  </Boton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

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
