"use client";

import { useEffect, useState } from "react";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";

const PASOS = [
  {
    tipo: "bienvenida",
    titulo: "Bienvenido a InventaVen",
    texto:
      "En este dispositivo vas a registrar tus productos, registrar ventas y revisar tu inventario y ganancias.",
  },
  {
    tipo: "config",
    titulo: "Configuración inicial",
    texto:
      "Registra el RIF, el nombre completo del negocio (con .C.A o similar), la dirección, la zona postal y el tipo de negocio.",
  },
  {
    tipo: "preferencias",
    titulo: "Preferencias y capacitación",
    texto:
      "Activa el modo oscuro y la actualización automática de precios, y revisa las secciones de capacitación.",
  },
];

export default function ModalBienvenida({ abierto, onCerrar }) {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (abierto) setPaso(0);
  }, [abierto]);

  if (!abierto) return null;

  const pasoActual = PASOS[Math.min(paso, PASOS.length - 1)];

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={pasoActual.titulo}
      descripcion={`Paso ${Math.min(paso + 1, PASOS.length)} de ${PASOS.length}`}
      ancho="md"
    >
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <p className="text-lg font-bold tracking-tight text-[var(--texto)]">{pasoActual.texto}</p>
        {paso === 0 ? (
          <Boton className="animate-pulse" onClick={() => setPaso(1)}>
            Siguiente
          </Boton>
        ) : paso < PASOS.length - 1 ? (
          <Boton onClick={() => setPaso((valor) => valor + 1)}>Siguiente</Boton>
        ) : (
          <Boton onClick={onCerrar}>Entendido</Boton>
        )}
      </div>
    </Modal>
  );
}
