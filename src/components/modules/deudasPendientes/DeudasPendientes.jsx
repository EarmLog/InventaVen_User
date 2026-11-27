"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, HandCoins, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db/baseDatos";
import { esVentaReportada } from "@/lib/utilidades/ventas";
import Deudores from "@/components/modules/deudores/Deudores";
import Pendientes from "@/components/modules/pendientes/Pendientes";

export default function DeudasPendientes({ pestanaInicial = "deudas" }) {
  const router = useRouter();
  const [pestana, setPestana] = useState(
    pestanaInicial === "pendientes" ? "pendientes" : "deudas"
  );

  const deudasActivas =
    useLiveQuery(
      () =>
        db
          ? db.deudas.filter((deuda) => deuda.estado !== "pagada").count()
          : 0,
      [],
      0
    ) || 0;
  const pendientes =
    useLiveQuery(
      () => (db ? db.ventas.filter(esVentaReportada).count() : 0),
      [],
      0
    ) || 0;

  useEffect(() => {
    setPestana(pestanaInicial === "pendientes" ? "pendientes" : "deudas");
  }, [pestanaInicial]);

  function cambiarPestana(valor) {
    setPestana(valor);
    router.replace(
      valor === "pendientes"
        ? "/panel/deudas-pendientes?pestana=pendientes"
        : "/panel/deudas-pendientes",
      { scroll: false }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deudas/Pendientes</h1>
          <p className="mt-1 text-sm text-[var(--texto-suave)]">
            Cobra saldos y resuelve ventas reportadas con error desde un solo lugar.
          </p>
        </div>
        <Link
          href="/panel"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--borde)] bg-[var(--superficie)] px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--superficie-2)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Secciones de deudas y pendientes"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--borde)] bg-[var(--superficie-2)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "deudas"}
          onClick={() => cambiarPestana("deudas")}
          className={[
            "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm",
            pestana === "deudas"
              ? "bg-[var(--superficie)] text-[var(--texto)] shadow-sm"
              : "text-[var(--texto-suave)] hover:text-[var(--texto)]",
          ].join(" ")}
        >
          <HandCoins className="h-4 w-4" />
          Deudas
          {deudasActivas > 0 ? (
            <span className="rounded-full bg-[var(--primario-suave)] px-1.5 py-0.5 text-[10px] text-[var(--primario-fuerte)]">
              {deudasActivas}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "pendientes"}
          onClick={() => cambiarPestana("pendientes")}
          className={[
            "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm",
            pestana === "pendientes"
              ? "bg-[var(--superficie)] text-[var(--texto)] shadow-sm"
              : "text-[var(--texto-suave)] hover:text-[var(--texto)]",
          ].join(" ")}
        >
          <TriangleAlert className="h-4 w-4" />
          Ventas pendientes
          {pendientes > 0 ? (
            <span className="rounded-full bg-[var(--advertencia-suave)] px-1.5 py-0.5 text-[10px] text-[var(--advertencia)]">
              {pendientes}
            </span>
          ) : null}
        </button>
      </div>

      <div role="tabpanel">
        {pestana === "deudas" ? <Deudores /> : <Pendientes />}
      </div>
    </div>
  );
}
