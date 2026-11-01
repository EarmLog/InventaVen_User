"use client";

const VARIANTES = {
  neutra: "bg-[var(--superficie-3)] text-[var(--texto-suave)]",
  exito: "bg-[var(--primario-suave)] text-[var(--primario-fuerte)]",
  peligro: "bg-[var(--peligro-suave)] text-[var(--peligro)]",
  advertencia: "bg-[var(--advertencia-suave)] text-[var(--advertencia)]",
  info: "bg-[var(--info-suave)] text-[var(--info)]",
};

export default function Etiqueta({ children, variante = "neutra", className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        VARIANTES[variante] || VARIANTES.neutra,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
