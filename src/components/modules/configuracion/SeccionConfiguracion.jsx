"use client";

import { ChevronDown } from "lucide-react";

const CLASES_TONO = {
  primario: "bg-[var(--primario-suave)] text-[var(--primario)]",
  info: "bg-[var(--info-suave)] text-[var(--info)]",
  advertencia: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
  peligro: "bg-[var(--peligro-suave)] text-[var(--peligro)]",
  violeta:
    "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
};

export default function SeccionConfiguracion({
  id,
  abierto,
  onAlternar,
  icono: Icono,
  titulo,
  descripcion,
  tono = "primario",
  children,
}) {
  const clasesTono = CLASES_TONO[tono] || CLASES_TONO.primario;

  return (
    <details
      open={abierto}
      className="group overflow-hidden rounded-2xl border border-[var(--borde)] bg-[var(--superficie)]"
    >
      <summary
        onClick={(evento) => {
          evento.preventDefault();
          onAlternar(id);
        }}
        className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left transition hover:bg-[var(--superficie-2)] sm:p-5 [&::-webkit-details-marker]:hidden"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${clasesTono}`}
          >
            <Icono className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">{titulo}</p>
            {descripcion ? (
              <p className="text-[11px] text-[var(--texto-suave)]">{descripcion}</p>
            ) : null}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--texto-suave)] transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--borde)] p-4 sm:p-5">{children}</div>
    </details>
  );
}
