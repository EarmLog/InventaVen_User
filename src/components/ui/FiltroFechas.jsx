"use client";

import { CalendarDays } from "lucide-react";
import { fechaParaInput, inicioDelDia } from "@/lib/utilidades/formato";

const PRESETS = [
  { etiqueta: "7 días", dias: 6 },
  { etiqueta: "30 días", dias: 29 },
  { etiqueta: "90 días", dias: 89 },
];

export default function FiltroFechas({
  desde,
  hasta,
  onCambiar,
  className = "",
}) {
  function aplicarRango(nuevaDesde, nuevaHasta) {
    if (!nuevaDesde || !nuevaHasta || nuevaDesde > nuevaHasta) return;
    onCambiar({ desde: nuevaDesde, hasta: nuevaHasta });
  }

  function aplicarPreset(dias) {
    const fin = new Date();
    const inicio = inicioDelDia(fin);
    inicio.setDate(inicio.getDate() - dias);
    aplicarRango(fechaParaInput(inicio), fechaParaInput(fin));
  }

  function aplicarMesActual() {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    aplicarRango(fechaParaInput(inicio), fechaParaInput(hoy));
  }

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
          <CalendarDays className="h-4 w-4 text-[var(--primario)]" />
          Desde
        </span>
        <input
          type="date"
          className="campo h-9 w-auto min-w-[140px] px-2.5 py-1.5 text-xs"
          value={desde}
          max={hasta}
          onChange={(evento) =>
            aplicarRango(evento.target.value, hasta)
          }
          aria-label="Fecha inicial"
        />
        <span className="text-[11px] text-[var(--texto-tenue)]">hasta</span>
        <input
          type="date"
          className="campo h-9 w-auto min-w-[140px] px-2.5 py-1.5 text-xs"
          value={hasta}
          min={desde}
          onChange={(evento) =>
            aplicarRango(desde, evento.target.value)
          }
          aria-label="Fecha final"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.etiqueta}
            type="button"
            onClick={() => aplicarPreset(preset.dias)}
            className="rounded-lg border border-[var(--borde)] bg-[var(--superficie-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--texto-suave)] transition hover:border-[var(--primario)]/40 hover:text-[var(--texto)]"
          >
            {preset.etiqueta}
          </button>
        ))}
        <button
          type="button"
          onClick={aplicarMesActual}
          className="rounded-lg border border-[var(--borde)] bg-[var(--superficie-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--texto-suave)] transition hover:border-[var(--primario)]/40 hover:text-[var(--texto)]"
        >
          Este mes
        </button>
      </div>
    </div>
  );
}
