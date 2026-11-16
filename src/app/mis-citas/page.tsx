import type { Metadata } from "next";
import { MisCitasCliente } from "./MisCitasCliente";

export const metadata: Metadata = {
  title: "Mis citas",
  description: "Consulta, descarga o cancela tus citas.",
};

export default function MisCitasPage() {
  return (
    <section>
      <h1>Mis citas</h1>
      <p>Consulta tus citas activas, descarga el archivo .ics o cancela hasta 2 horas antes.</p>
      <MisCitasCliente />
    </section>
  );
}
