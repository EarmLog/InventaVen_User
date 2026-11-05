"use client";

import { useEffect, useState } from "react";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";

const PASOS = [
  {
    titulo: "Bienvenido a InventaVen",
    texto:
      "En este dispositivo vas a registrar tus productos, registrar ventas y revisar tu inventario y ganancias.",
  },
  {
    titulo: "Escaneo móvil",
    texto:
      "Usa el escáner desde el móvil para registrar punto de venta o altas de inventario sin escribir códigos a mano.",
  },
  {
    titulo: "Copias de seguridad",
    texto:
      "Genera respaldos periódicos desde la configuración para proteger tus datos ante pérdida o falla del dispositivo.",
  },
  {
    titulo: "Precios en bolívares",
    texto:
      "La tasa del dólar se actualiza automáticamente. La actualización de precios en bolívares queda desactivada por defecto.",
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
      pie={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {PASOS.map((item, indice) => (
              <span
                key={item.titulo}
                className={[
                  "h-2 w-6 rounded-full transition-colors",
                  indice === paso
                    ? "bg-[var(--primario)]"
                    : "bg-[var(--borde-fuerte)]",
                ].join(" ")}
              />
            ))}
          </div>
          {paso < PASOS.length - 1 ? (
            <Boton onClick={() => setPaso((valor) => valor + 1)}>Siguiente</Boton>
          ) : (
            <Boton onClick={onCerrar}>Entendido</Boton>
          )}
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--texto-suave)]">{pasoActual.texto}</p>
    </Modal>
  );
}
