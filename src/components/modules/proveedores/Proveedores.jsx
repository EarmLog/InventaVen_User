"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Package, Plus, Search, Trash2, Pencil, Phone, Mail, Building2 } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { generarId } from "@/lib/utilidades/formato";
import { toast } from "sonner";
import Tarjeta from "@/components/ui/Tarjeta";
import Boton from "@/components/ui/Boton";
import Entrada from "@/components/ui/Entrada";
import EstadoVacio from "@/components/ui/EstadoVacio";

export default function Proveedores() {
  const proveedores = useLiveQuery(() => (db ? db.proveedores.toArray() : []), [], []) || [];
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [nombre, setNombre] = useState("");
  const [rif, setRif] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.rif && p.rif.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const abrirModal = (prov = null) => {
    if (prov) {
      setProveedorEditando(prov);
      setNombre(prov.nombre || "");
      setRif(prov.rif || "");
      setTelefono(prov.telefono || "");
      setEmail(prov.email || "");
      setDireccion(prov.direccion || "");
    } else {
      setProveedorEditando(null);
      setNombre("");
      setRif("");
      setTelefono("");
      setEmail("");
      setDireccion("");
    }
    setModalAbierto(true);
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre del proveedor es obligatorio.");
      return;
    }
    try {
      if (proveedorEditando) {
        await db.proveedores.update(proveedorEditando.id, {
          nombre: nombre.trim(),
          rif: rif.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          direccion: direccion.trim(),
          actualizadoEn: new Date().toISOString(),
        });
        toast.success("Proveedor actualizado exitosamente.");
      } else {
        await db.proveedores.add({
          id: generarId(),
          nombre: nombre.trim(),
          rif: rif.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          direccion: direccion.trim(),
          creadoEn: new Date().toISOString(),
        });
        toast.success("Proveedor registrado exitosamente.");
      }
      setModalAbierto(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar proveedor.");
    }
  };

  const eliminarProveedor = async (id) => {
    if (!confirm("¿Deseas eliminar este proveedor?")) return;
    try {
      await db.proveedores.delete(id);
      toast.success("Proveedor eliminado.");
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar proveedor.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--texto-suave)]" />
          <Entrada
            placeholder="Buscar por nombre o RIF..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Boton onClick={() => abrirModal()} variante="primario" className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </Boton>
      </div>

      {proveedoresFiltrados.length === 0 ? (
        <EstadoVacio
          icono={Package}
          titulo="No hay proveedores registrados"
          descripcion="Agrega tus proveedores para gestionar compras y reabastecimiento."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proveedoresFiltrados.map((prov) => (
            <Tarjeta key={prov.id} className="p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm">{prov.nombre}</h3>
                  <span className="rounded-full bg-[var(--superficie-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--texto-suave)]">
                    {prov.rif || "Sin RIF"}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[var(--texto-suave)]">
                  {prov.telefono && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-[var(--texto-tenue)]" />
                      {prov.telefono}
                    </p>
                  )}
                  {prov.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-[var(--texto-tenue)]" />
                      {prov.email}
                    </p>
                  )}
                  {prov.direccion && (
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-[var(--texto-tenue)]" />
                      {prov.direccion}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--borde)]">
                <button
                  onClick={() => abrirModal(prov)}
                  className="p-1.5 rounded-lg hover:bg-[var(--superficie-2)] text-[var(--texto-suave)]"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => eliminarProveedor(prov.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--advertencia-suave)] text-red-600"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--superficie)] p-6 shadow-xl border border-[var(--borde)] space-y-4">
            <h2 className="text-lg font-bold">
              {proveedorEditando ? "Editar proveedor" : "Registrar nuevo proveedor"}
            </h2>
            <form onSubmit={guardarProveedor} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--texto-suave)]">Nombre / Empresa *</label>
                <Entrada
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Distribuidora C.A."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--texto-suave)]">RIF / Cédula</label>
                <Entrada
                  value={rif}
                  onChange={(e) => setRif(e.target.value)}
                  placeholder="Ej. J-12345678-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--texto-suave)]">Teléfono</label>
                <Entrada
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 0414-1234567"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--texto-suave)]">Correo electrónico</label>
                <Entrada
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. contacto@distribuidora.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--texto-suave)]">Dirección</label>
                <Entrada
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej. Zona Industrial, Galpón 4"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <Boton type="button" variante="secundario" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Boton>
                <Boton type="submit" variante="primario">
                  Guardar
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
