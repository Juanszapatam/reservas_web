import type { Metadata } from "next";
import { ReservarCliente } from "./ReservarCliente";

export const metadata: Metadata = {
  title: "Reservar",
  description: "Consulta las franjas disponibles y reserva una cita de 30 minutos.",
};

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  searchParams?: Promise<{ fecha?: string }> | { fecha?: string };
};

export default async function ReservarPage({ searchParams }: Props) {
  const sp = await Promise.resolve(searchParams);
  const fecha = typeof sp?.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoyISO();
  return (
    <section>
      <h1>Reservar una cita</h1>
      <p>Consulta las franjas disponibles por día y selecciona un horario.</p>
      <ReservarCliente fechaInicial={fecha} />
    </section>
  );
}
