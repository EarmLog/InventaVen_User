"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

export default function CompartirBarra({ url = "", nombreNegocio = "esta tienda" }) {
  const [destino, setDestino] = useState(url);
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(false);

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--texto)]">
        <Share2 className="h-4 w-4 text-emerald-600" />
        Compartir catálogo
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {enlaces.map(({ etiqueta, href, icono: Icono, clase }) => (
          <a
            key={etiqueta}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${clase}`}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </a>
        ))}
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--borde)] bg-[var(--superficie)] px-3 py-2 text-xs font-semibold text-[var(--texto)] transition hover:bg-[var(--superficie-2)]"
        >
          {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Enlace copiado" : "Copiar enlace"}
        </button>
        {errorCopia ? (
          <span className="text-xs text-red-500">No se pudo copiar el enlace.</span>
        ) : null}
      </div>
    </div>
  );
}
