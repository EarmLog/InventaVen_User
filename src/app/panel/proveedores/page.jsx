"use client";

import Link from "next/link";
import Proveedores from "@/components/modules/proveedores/Proveedores";

export default function PaginaProveedores() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Gestión local de proveedores y libreta de contactos comerciales.
          </p>
        </div>
        <Link
          href="/panel"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
        >
          Volver al panel
        </Link>
      </div>
      <Proveedores />
    </div>
  );
}
