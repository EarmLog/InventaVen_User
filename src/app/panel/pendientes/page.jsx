import { redirect } from "next/navigation";

export default function PaginaPendientes() {
  redirect("/panel/deudas-pendientes?pestana=pendientes");
}
