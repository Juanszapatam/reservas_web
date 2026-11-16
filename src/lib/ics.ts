import type { Cita } from "@/schemas/cita";
import { formatearFechaHora } from "@/lib/fechas";

function aIcs(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generarICS(cita: Cita, zonaHoraria: string): string {
  const inicio = aIcs(cita.inicio);
  const fin = aIcs(new Date(new Date(cita.inicio).getTime() + cita.duracionMin * 60_000).toISOString());
  const ahora = aIcs(new Date().toISOString());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reserva de citas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${cita.franja}@reserva-de-citas.local`,
    `DTSTAMP:${ahora}`,
    `DTSTART:${inicio}`,
    `DTEND:${fin}`,
    `SUMMARY:${escapar(cita.servicio)}`,
    `DESCRIPTION:${escapar(`Cita en ${cita.servicio}. Hora del negocio: ${formatearFechaHora(cita.inicio, zonaHoraria)}`)}`,
    "LOCATION:Negocio",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function descargarICS(cita: Cita, zonaHoraria: string): void {
  const contenido = generarICS(cita, zonaHoraria);
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `cita-${cita.franja}.ics`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
