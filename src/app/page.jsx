"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2 } from "lucide-react";
import { useSesion } from "@/context/SesionContext";

export default function Inicio() {
  const { sesion } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (sesion === undefined) return;
    router.replace(sesion ? "/panel" : "/login");
  }, [sesion, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primario)] text-white shadow-lg">
        <Boxes className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm text-[var(--texto-suave)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Abriendo InventaVen...
      </div>
    </div>
  );
}
