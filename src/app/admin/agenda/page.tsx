import type { Metadata } from "next";
import { AdminAgendaCliente } from "./AdminAgendaCliente";

export const metadata: Metadata = {
  title: "Agenda del negocio",
  description: "Agenda del día y configuración del horario del negocio.",
};

export default function AgendaAdminPage() {
  return (
    <section>
      <h1>Agenda del negocio</h1>
      <p>Consulta las citas del día, cancela si es necesario y ajusta el horario de atención.</p>
      <AdminAgendaCliente />
    </section>
  );
}
