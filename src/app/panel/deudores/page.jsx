import { redirect } from "next/navigation";

export default function PaginaDeudores() {
  redirect("/panel/deudas-pendientes?pestana=deudas");
}
