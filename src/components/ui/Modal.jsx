"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const ANCHOS = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

export default function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  ancho = "md",
  pie = null,
  bloqueado = false,
  claseContenido = "",
}) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;
    const manejarTecla = (evento) => {
      if (evento.key === "Escape" && !bloqueado) onCerrar?.();
    };
    document.addEventListener("keydown", manejarTecla);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = overflowOriginal;
    };
  }, [abierto, bloqueado, onCerrar]);

  if (!montado || !abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !bloqueado) onCerrar?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo || "Ventana"}
    >
      <div
        className={[
          "animar-modal my-auto w-[95vw] overflow-hidden rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] shadow-2xl",
          ANCHOS[ancho] || ANCHOS.md,
          claseContenido,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--borde)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--texto)]">
              {titulo}
            </h2>
            {descripcion ? (
              <p className="mt-0.5 text-xs text-[var(--texto-suave)]">{descripcion}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => !bloqueado && onCerrar?.()}
            className="rounded-lg p-1.5 text-[var(--texto-suave)] transition hover:bg-[var(--superficie-3)] hover:text-[var(--texto)] disabled:opacity-40"
            aria-label="Cerrar"
            disabled={bloqueado}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
        {pie ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--borde)] bg-[var(--superficie-2)] px-5 py-4">
            {pie}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
