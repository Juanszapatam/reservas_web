import type { Metadata } from "next";
import Link from "next/link";
import { obtenerHorario } from "@/services/citas";
import { SEDES_POR_DEFECTO as SEDES } from "@/lib/sedes";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Reserva tu cita en franjas de 30 minutos y consulta la disponibilidad del negocio.",
};

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function HomePage() {
  const horario = await obtenerHorario();
  const dias = horario.diasLaborales.map((d) => NOMBRES_DIA[d]).join(", ");

  return (
    <section>
      <h1>Reserva de citas</h1>
      <p>
        Bienvenido al sistema de reservas del negocio. Consulta la disponibilidad por día, reserva una franja de 30
        minutos y administra tus citas.
      </p>

      <h2>Horario de atención</h2>
      <ul>
        <li>
          <strong>Días:</strong> {dias}
        </li>
        <li>
          <strong>Horario:</strong> {horario.apertura} – {horario.cierre} ({horario.zonaHoraria})
        </li>
        <li>
          <strong>Franjas:</strong> 30 minutos
        </li>
        <li>
          <strong>Cancelación:</strong> hasta 2 horas antes
        </li>
      </ul>

      <h2>Servicios por sede</h2>
      {SEDES.map((sede) => (
        <div key={sede.id}>
          <h3>{sede.nombre}</h3>
          <ul>
            {sede.servicios.map((servicio) => (
              <li key={servicio.id}>{servicio.nombre}</li>
            ))}
          </ul>
        </div>
      ))}

      <p>
        <Link href="/reservar">Reservar una cita</Link> · <Link href="/mis-citas">Ver mis citas</Link>
      </p>
    </section>
  );
}
