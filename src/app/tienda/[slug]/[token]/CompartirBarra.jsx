"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

export default function CompartirBarra({ url = "", nombreNegocio = "esta tienda" }) {
  const [destino, setDestino] = useState(url);
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(false);
  const detalles = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDestino(window.location.href || url);
    }
  }, [url]);

  useEffect(() => {
    if (!copiado) return undefined;
    const temporizador = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(temporizador);
  }, [copiado]);

  async function copiar() {
    if (!destino) return;
    try {
      await navigator.clipboard.writeText(destino);
      setCopiado(true);
      setErrorCopia(false);
      if (detalles.current) detalles.current.open = false;
    } catch {
      setErrorCopia(true);
    }
  }

  const texto = `Mira el catálogo de ${nombreNegocio}: ${destino}`;
  const enlaces = [
    {
      etiqueta: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(texto)}`,
      icono: MessageCircle,
      clase: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      etiqueta: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(destino)}`,
      icono: Share2,
      clase: "bg-blue-600 hover:bg-blue-700",
    },
    {
      etiqueta: "X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(destino)}&text=${encodeURIComponent(texto)}`,
      icono: Share2,
      clase: "bg-slate-800 hover:bg-slate-900",
    },
  ];

  return (
    <details ref={detalles} className="relative shrink-0">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--borde)] bg-[var(--superficie-2)] px-2.5 py-2 text-[11px] font-bold text-[var(--texto)] transition hover:bg-[var(--superficie-3)] [&::-webkit-details-marker]:hidden">
        <Share2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">Compartir</span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] p-2 shadow-xl">
        {enlaces.map(({ etiqueta, href, icono: Icono, clase }) => (
          <a
            key={etiqueta}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${clase}`}
          >
            <Icono className="h-3.5 w-3.5" />
            {etiqueta}
          </a>
        ))}
        <button
          type="button"
          onClick={copiar}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--borde)] px-3 py-2 text-xs font-semibold text-[var(--texto)] transition hover:bg-[var(--superficie-2)]"
        >
          {copiado ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copiado ? "Enlace copiado" : "Copiar enlace"}
        </button>
        {errorCopia ? (
          <p className="px-1 pt-2 text-[10px] text-red-500">
            No se pudo copiar el enlace.
          </p>
        ) : null}
      </div>
    </details>
  );
}
