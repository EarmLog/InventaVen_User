"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function IndicadorConexion() {
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  if (enLinea) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-[var(--advertencia)]/30 bg-[var(--advertencia-suave)] px-3 py-2 text-[11px] font-semibold text-[var(--advertencia)] shadow-lg">
      <WifiOff className="h-3.5 w-3.5" />
      Sin conexión · datos locales
    </div>
  );
}
