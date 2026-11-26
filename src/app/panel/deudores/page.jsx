"use client";

import Link from "next/link";
import Deudores from "@/components/modules/deudores/Deudores";

export default function PaginaDeudores() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deudores y cobranzas</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Controla saldos, abonos y cobros pendientes de tus clientes.
          </p>
        </div>
        <Link
          href="/panel"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
        >
          Volver al panel
        </Link>
      </div>
      <Deudores />
    </div>
  );
}
