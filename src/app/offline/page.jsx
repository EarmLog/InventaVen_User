import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Sin conexión",
};

export default function PaginaSinConexion() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--fondo)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--borde)] bg-[var(--superficie)] p-6 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--advertencia-suave)] text-[var(--advertencia)]">
          <CloudOff className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Sin conexión</h1>
        <p className="mt-2 text-sm text-[var(--texto-suave)]">
          Esta pantalla no estaba guardada en el dispositivo. Vuelve a abrir el panel desde
          el acceso directo; tus datos locales siguen en este equipo.
        </p>
        <Link
          href="/panel"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primario)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Volver al panel
        </Link>
      </div>
    </main>
  );
}
