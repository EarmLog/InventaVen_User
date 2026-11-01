import {
  BarChart3,
  Boxes,
  CheckCircle2,
  DollarSign,
  ScanBarcode,
  ShieldCheck,
} from "lucide-react";

const beneficios = [
  {
    Icono: Boxes,
    titulo: "Inventario inteligente",
    texto: "Productos, variantes, bultos, ofertas y SKU automático.",
  },
  {
    Icono: ScanBarcode,
    titulo: "Punto de venta rápido",
    texto: "Vende, cobra y descuenta stock en segundos.",
  },
  {
    Icono: BarChart3,
    titulo: "Análisis claro",
    texto: "Ventas, ganancias y productos más vendidos en un vistazo.",
  },
  {
    Icono: DollarSign,
    titulo: "Dólar y bolívares",
    texto: "Precios duales actualizados con la tasa del día.",
  },
];

export default function LayoutAutenticacion({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#062e24] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/40">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">InventaVen</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">
                Inventario · POS · Análisis
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Tus datos viven en tu dispositivo
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">
              Todo tu negocio,
              <br />
              <span className="text-emerald-300">en un solo lugar.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-emerald-100/70">
              Controla tu inventario, cobra en bolívares o dólares y descubre qué
              productos realmente te hacen ganar dinero.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {beneficios.map(({ Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <Icono className="h-5 w-5 text-emerald-300" />
                <p className="mt-2 text-sm font-semibold">{titulo}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/60">
                  {texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-emerald-100/50">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          Sin costo durante tus primeros 30 días.
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primario)] text-white shadow">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold tracking-tight">InventaVen</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--texto-suave)]">
                Inventario · POS · Análisis
              </p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
