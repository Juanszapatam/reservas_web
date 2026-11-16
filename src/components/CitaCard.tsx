"use client";

import type { Cita } from "@/schemas/cita";
import { nombreServicio } from "@/schemas/cita";
import { horasHasta, formatearFechaHora } from "@/lib/fechas";
import { descargarICS } from "@/lib/ics";
import { HoraLocal } from "@/components/HoraLocal";
import styles from "./CitaCard.module.css";

type Props = {
  cita: Cita;
  zonaHoraria: string;
  onCancelar?: (cita: Cita) => void;
  cancelando?: boolean;
  ahora?: Date;
};

export function CitaCard({ cita, zonaHoraria, onCancelar, cancelando, ahora = new Date() }: Props) {
  const esActiva = cita.estado === "confirmada" && new Date(cita.inicio) > ahora;
  const esFinalizada = cita.estado === "confirmada" && !esActiva;
  const sePuedeCancelar = esActiva && horasHasta(cita.inicio, ahora) >= 2;
  const estadoTexto = esActiva ? "Confirmada" : esFinalizada ? "Finalizada" : "Cancelada";

  return (
    <article className={styles.card} aria-label={`Cita de ${nombreServicio(cita.servicio)}`}>
      <header className={styles.cabecera}>
        <h3>{nombreServicio(cita.servicio)}</h3>
        <span
          className={`${styles.estado} ${
            esActiva ? styles.activa : esFinalizada ? styles.finalizada : styles.cancelada
          }`}
        >
          {estadoTexto}
        </span>
      </header>
      <p className={styles.hora}>
        <strong>Hora del negocio:</strong>{" "}
        <time dateTime={cita.inicio}>{formatearFechaHora(cita.inicio, zonaHoraria)}</time>
      </p>
      <p className={styles.local}>
        <HoraLocal iso={cita.inicio} />
      </p>
      <p className={styles.correo}>Reservada por: {cita.correo}</p>
      <div className={styles.acciones}>
        <button type="button" onClick={() => descargarICS(cita, zonaHoraria)}>
          Agregar a mi calendario (.ics)
        </button>
        {esActiva && onCancelar ? (
          <button
            type="button"
            className={styles.peligro}
            onClick={() => onCancelar(cita)}
            disabled={!sePuedeCancelar || cancelando}
            aria-describedby={!sePuedeCancelar ? `cancelar-${cita.franja}` : undefined}
          >
            {cancelando ? "Cancelando…" : "Cancelar cita"}
          </button>
        ) : null}
      </div>
      {esActiva && !sePuedeCancelar ? (
        <p id={`cancelar-${cita.franja}`} className={styles.aviso}>
          Ya no se puede cancelar: faltan menos de 2 horas.
        </p>
      ) : null}
    </article>
  );
}
