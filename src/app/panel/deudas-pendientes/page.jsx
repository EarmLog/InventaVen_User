import DeudasPendientes from "@/components/modules/deudasPendientes/DeudasPendientes";

export default function PaginaDeudasPendientes({ searchParams }) {
  const pestanaInicial =
    searchParams?.pestana === "pendientes" ? "pendientes" : "deudas";

  return <DeudasPendientes pestanaInicial={pestanaInicial} />;
}
