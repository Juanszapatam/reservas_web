import { horarioPorDefecto, type Horario } from "@/schemas/horario";

const globalConHorario = globalThis as typeof globalThis & {
  __reservaHorario?: Horario;
};

export async function obtenerHorario(): Promise<Horario> {
  return globalConHorario.__reservaHorario ?? horarioPorDefecto;
}

export async function guardarHorario(horario: Horario): Promise<Horario> {
  globalConHorario.__reservaHorario = horario;
  return horario;
}

export function reiniciarHorario(): void {
  globalConHorario.__reservaHorario = undefined;
}
