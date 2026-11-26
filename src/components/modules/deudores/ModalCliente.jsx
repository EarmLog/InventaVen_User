"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Entrada from "@/components/ui/Entrada";
import Alerta from "@/components/ui/Alerta";
import { guardarCliente } from "@/lib/db/repositorios";

export default function ModalCliente({ abierto, cliente = null, onCerrar, onGuardado }) {
  const [formulario, setFormulario] = useState({
    nombre: "",
    telefono: "",
    documento: "",
    direccion: "",
    notas: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    setFormulario({
      nombre: cliente?.nombre || "",
      telefono: cliente?.telefono || "",
      documento: cliente?.documento || "",
      direccion: cliente?.direccion || "",
      notas: cliente?.notas || "",
    });
    setError("");
  }, [abierto, cliente]);

  function actualizar(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    setError("");
    if (!formulario.nombre.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      await guardarCliente({ ...formulario, id: cliente?.id || null });
      toast.success(
        cliente
          ? "Cliente actualizado correctamente."
          : "Cliente registrado correctamente."
      );
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
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={cliente ? "Editar cliente" : "Nuevo cliente"}
      descripcion="Datos de contacto para dar seguimiento a sus deudas."
      ancho="md"
      bloqueado={guardando}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            <UserRound className="h-4 w-4" />
            {cliente ? "Guardar cambios" : "Registrar cliente"}
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre o razón social" requerido>
            <Entrada
              value={formulario.nombre}
              onChange={(evento) => actualizar("nombre", evento.target.value)}
              placeholder="Nombre del cliente"
              maxLength={160}
              autoFocus
            />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Entrada
              value={formulario.telefono}
              onChange={(evento) => actualizar("telefono", evento.target.value)}
              placeholder="0414-1234567"
              maxLength={40}
            />
          </Campo>
          <Campo etiqueta="Cédula / RIF">
            <Entrada
              value={formulario.documento}
              onChange={(evento) => actualizar("documento", evento.target.value)}
              placeholder="V-12345678"
              maxLength={40}
            />
          </Campo>
          <Campo etiqueta="Dirección">
            <Entrada
              value={formulario.direccion}
              onChange={(evento) => actualizar("direccion", evento.target.value)}
              placeholder="Dirección del cliente"
              maxLength={200}
            />
          </Campo>
          <Campo etiqueta="Notas" className="sm:col-span-2">
            <textarea
              className="campo min-h-20 resize-y"
              value={formulario.notas}
              onChange={(evento) => actualizar("notas", evento.target.value)}
              placeholder="Referencias, observaciones, acuerdos de pago..."
              maxLength={500}
            />
          </Campo>
        </div>
      </div>
    </Modal>
  );
}
