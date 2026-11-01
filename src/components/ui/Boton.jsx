"use client";

import { Loader2 } from "lucide-react";

const VARIANTES = {
  primario:
    "bg-[var(--primario)] text-white hover:bg-[var(--primario-fuerte)] shadow-sm",
  secundario:
    "bg-[var(--superficie)] text-[var(--texto)] border border-[var(--borde)] hover:bg-[var(--superficie-2)]",
  peligro: "bg-[var(--peligro)] text-white hover:brightness-95 shadow-sm",
  peligroSuave:
    "bg-[var(--peligro-suave)] text-[var(--peligro)] border border-[var(--peligro)]/30 hover:brightness-95",
  fantasma:
    "bg-transparent text-[var(--texto-suave)] hover:bg-[var(--superficie-3)] hover:text-[var(--texto)]",
  exitoSuave:
    "bg-[var(--primario-suave)] text-[var(--primario-fuerte)] border border-[var(--primario)]/30 hover:brightness-95",
};

const TAMANOS = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-sm gap-2",
  icono: "h-9 w-9 justify-center",
};

export default function Boton({
  children,
  variante = "primario",
  tamano = "md",
  cargando = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={[
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primario)]/40",
        "disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTES[variante] || VARIANTES.primario,
        TAMANOS[tamano] || TAMANOS.md,
        className,
      ].join(" ")}
      {...props}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
