"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Alerta from "@/components/ui/Alerta";
import { eliminarProducto } from "@/lib/db/repositorios";

export default function ModalEliminar({ abierto, producto, onCerrar, onEliminado }) {
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  if (!producto) return null;

  async function eliminar() {
    setError("");
    setEliminando(true);
    try {
      await eliminarProducto(producto.id);
      toast.success("Producto eliminado del inventario.");
      onEliminado?.();
      onCerrar?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Eliminar producto"
      descripcion="Esta acción no se puede deshacer."
      ancho="sm"
      bloqueado={eliminando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={eliminando}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={eliminar} cargando={eliminando}>
            <Trash2 className="h-4 w-4" />
            Sí, eliminar
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
        <Alerta tipo="advertencia" titulo="Se eliminará del inventario">
          <strong>{producto.nombre}</strong> ({producto.sku}) con su stock actual de{" "}
          {producto.stock}. Las ventas ya registradas conservarán el nombre y el
          historial de la factura.
        </Alerta>
        <p className="text-xs leading-relaxed text-[var(--texto-suave)]">
          Si solo quieres dejar de venderlo temporalmente, edítalo y desactívalo en
          lugar de eliminarlo.
        </p>
      </div>
    </Modal>
  );
}
