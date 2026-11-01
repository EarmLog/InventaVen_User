"use client";

import { PackageOpen } from "lucide-react";

export default function EstadoVacio({
  titulo = "No hay registros todavía",
  descripcion = "",
  accion = null,
  icono: Icono = PackageOpen,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--superficie-3)] text-[var(--texto-suave)]">
        <Icono className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--texto)]">{titulo}</p>
        {descripcion ? (
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--texto-suave)]">
            {descripcion}
          </p>
        ) : null}
      </div>
      {accion}
    </div>
  );
}
