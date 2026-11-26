"use client";

import { CalendarDays } from "lucide-react";
import {
  fechaParaInput,
  inicioDelDia,
  sumarDias,
} from "@/lib/utilidades/formato";

function rangoUltimosDias(dias) {
  const fin = new Date();
  const inicio = inicioDelDia(fin);
  inicio.setDate(inicio.getDate() - dias);
  return { desde: fechaParaInput(inicio), hasta: fechaParaInput(fin) };
}

const PRESETS = [
  {
    etiqueta: "Hoy",
    rango: () => {
      const hoy = fechaParaInput();
      return { desde: hoy, hasta: hoy };
    },
  },
  {
    etiqueta: "Ayer",
    rango: () => {
      const ayer = fechaParaInput(sumarDias(new Date(), -1));
      return { desde: ayer, hasta: ayer };
    },
  },
  { etiqueta: "7 días", rango: () => rangoUltimosDias(6) },
  { etiqueta: "30 días", rango: () => rangoUltimosDias(29) },
  { etiqueta: "90 días", rango: () => rangoUltimosDias(89) },
  {
    etiqueta: "Este mes",
    rango: () => {
      const hoy = new Date();
      return {
        desde: fechaParaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta: fechaParaInput(hoy),
      };
    },
  },
  {
    etiqueta: "Mes pasado",
    rango: () => {
      const hoy = new Date();
      return {
        desde: fechaParaInput(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
        hasta: fechaParaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
      };
    },
  },
  {
    etiqueta: "Este año",
    rango: () => {
      const hoy = new Date();
      return {
        desde: fechaParaInput(new Date(hoy.getFullYear(), 0, 1)),
        hasta: fechaParaInput(hoy),
      };
    },
  },
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

  function aplicarPreset(preset) {
    const rango = preset.rango();
    aplicarRango(rango.desde, rango.hasta);
  }

  return (
    <div
      className={[
        "space-y-2.5 rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] p-3",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
        <CalendarDays className="h-4 w-4 text-[var(--primario)]" />
        Período
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
            Desde
          </span>
          <input
            type="date"
            className="campo h-9 w-full min-w-0 px-2.5 py-1.5 text-xs"
            value={desde}
            max={hasta}
            onChange={(evento) =>
              aplicarRango(evento.target.value, hasta)
            }
            aria-label="Fecha inicial"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
            Hasta
          </span>
          <input
            type="date"
            className="campo h-9 w-full min-w-0 px-2.5 py-1.5 text-xs"
            value={hasta}
            min={desde}
            onChange={(evento) =>
              aplicarRango(desde, evento.target.value)
            }
            aria-label="Fecha final"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--borde)] pt-2.5">
        <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--texto-tenue)]">
          Rápido
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.etiqueta}
            type="button"
            onClick={() => aplicarPreset(preset)}
            className="rounded-lg border border-[var(--borde)] bg-[var(--superficie-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--texto-suave)] transition hover:border-[var(--primario)]/40 hover:text-[var(--texto)]"
          >
            {preset.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
