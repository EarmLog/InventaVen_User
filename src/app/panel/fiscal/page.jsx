"use client";

import Link from "next/link";
import Fiscalidad from "@/components/modules/fiscal/Fiscalidad";

export default function PaginaFiscal() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Facturación y fiscalidad</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Sección local dedicada al resumen fiscal y comprobantes.
          </p>
        </div>
        <Link
          href="/panel/analisis"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
        >
          Volver al análisis
        </Link>
      </div>
      <Fiscalidad />
    </div>
  );
}
