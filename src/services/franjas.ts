import type { Franja, MotivoVacio } from "@/schemas/franja";
import type { Horario } from "@/schemas/horario";
import {
  aUtc,
  diaSemana,
  esFechaISO,
  formatearHora,
  idFranja,
} from "@/lib/fechas";

export const DURACION_MIN = 30;

export type ResultadoFranjas = {
  franjas: Franja[];
  motivo?: MotivoVacio;
};

/**
 * Genera las franjas de un día a partir del horario del negocio y de las
 * citas ocupadas. Es una función pura: recibe `ahora` para poder probarla.
 */
export function generarFranjas(
  fecha: string,
  horario: Horario,
  ocupadas: Iterable<string>,
  ahora: Date = new Date()
): ResultadoFranjas {
  if (!esFechaISO(fecha)) {
    return { franjas: [], motivo: "sin-franjas" };
  }

  if (!horario.diasLaborales.includes(diaSemana(fecha))) {
    return { franjas: [], motivo: "dia-no-laboral" };
  }

  if (horario.bloqueos.includes(fecha)) {
    return { franjas: [], motivo: "bloqueado" };
  }

  const inicioDia = aUtc(fecha, horario.apertura, horario.zonaHoraria);
  const finDia = aUtc(fecha, horario.cierre, horario.zonaHoraria);
  const ocupadasSet = new Set(ocupadas);
  const franjas: Franja[] = [];
  let huboFuturas = false;

  for (
    let t = inicioDia.getTime();
    t + DURACION_MIN * 60_000 <= finDia.getTime();
    t += DURACION_MIN * 60_000
  ) {
    const inicio = new Date(t).toISOString();
    const fin = new Date(t + DURACION_MIN * 60_000).toISOString();
    const esPasada = t <= ahora.getTime();
    if (!esPasada) huboFuturas = true;
    franjas.push({
      inicio,
      fin,
      estado: esPasada || ocupadasSet.has(idFranja(inicio)) ? "ocupada" : "libre",
      etiqueta: `${formatearHora(inicio, horario.zonaHoraria)} - ${formatearHora(fin, horario.zonaHoraria)}`,
    });
  }

  if (!huboFuturas) {
    return { franjas: [], motivo: "pasado" };
  }

  return { franjas };
}
