"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

const ESTILOS = {
  info: {
    clase: "border-[var(--info)]/25 bg-[var(--info-suave)] text-[var(--info)]",
    Icono: Info,
  },
  exito: {
    clase:
      "border-[var(--primario)]/25 bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
    Icono: CheckCircle2,
  },
  advertencia: {
    clase:
      "border-[var(--advertencia)]/25 bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
    Icono: AlertTriangle,
  },
  error: {
    clase: "border-[var(--peligro)]/25 bg-[var(--peligro-suave)] text-[var(--peligro)]",
    Icono: XCircle,
  },
};

export default function Alerta({ tipo = "info", titulo, children, className = "" }) {
  const { clase, Icono } = ESTILOS[tipo] || ESTILOS.info;
  return (
    <div
      className={[
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs",
        clase,
        className,
      ].join(" ")}
    >
      <Icono className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="leading-relaxed">
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
