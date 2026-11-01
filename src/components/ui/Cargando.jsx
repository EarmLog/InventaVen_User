"use client";

import { Loader2 } from "lucide-react";

export default function Cargando({ texto = "Cargando información..." }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[var(--texto-suave)]">
      <Loader2 className="h-7 w-7 animate-spin text-[var(--primario)]" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}
