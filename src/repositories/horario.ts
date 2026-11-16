import type { Horario } from "@/schemas/horario";
import * as firestore from "./horario.firestore";
import * as memoria from "./horario.memoria";
import { repositorioFirestoreActivo } from "./seleccion";

export async function obtenerHorario(): Promise<Horario> {
  return repositorioFirestoreActivo()
    ? firestore.obtenerHorario()
    : memoria.obtenerHorario();
}

export async function guardarHorario(horario: Horario): Promise<Horario> {
  return repositorioFirestoreActivo()
    ? firestore.guardarHorario(horario)
    : memoria.guardarHorario(horario);
}

/** Solo afecta a los datos en memoria (demo/tests). */
export function reiniciarHorario(): void {
  memoria.reiniciarHorario();
}
