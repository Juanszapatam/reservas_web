import { Conflicto, NoEncontrado, Vencido } from "@/lib/errores";
import { horasHasta, idFranja, inicioDesdeFranja } from "@/lib/fechas";
import type { CrearCitaEntrada, Cita } from "@/schemas/cita";
import type { Horario } from "@/schemas/horario";
import type { Usuario } from "@/lib/auth";
import * as citasRepo from "@/repositories/citas";
import * as horarioRepo from "@/repositories/horario";
import { DURACION_MIN, generarFranjas } from "@/services/franjas";

export const MAX_CITAS_ACTIVAS = 2;
export const HORAS_MIN_CANCELACION = 2;

export async function obtenerHorario(): Promise<Horario> {
  return horarioRepo.obtenerHorario();
}

export async function actualizarHorario(horario: Horario): Promise<Horario> {
  return horarioRepo.guardarHorario(horario);
}

export async function crearCita({
  usuario,
  entrada,
  ahora = new Date(),
}: {
  usuario: Usuario;
  entrada: CrearCitaEntrada;
  ahora?: Date;
}): Promise<Cita> {
  const inicio = inicioDesdeFranja(entrada.franja);
  if (!inicio) {
    throw new Conflicto("La franja solicitada no es válida");
  }

  const fecha = entrada.franja.slice(0, 10);
  const horario = await horarioRepo.obtenerHorario();
  const { franjas, motivo } = generarFranjas(fecha, horario, [], ahora);
  const franja = franjas.find((f) => f.inicio === inicio);

  if (!franja) {
    if (motivo === "pasado") {
      throw new Vencido("No puedes reservar una franja que ya pasó");
    }
    throw new Conflicto("La franja no está dentro del horario del negocio");
  }

  if (new Date(inicio).getTime() <= ahora.getTime()) {
    throw new Conflicto("No puedes reservar una franja que ya pasó");
  }

  const activas = await citasRepo.listarActivasPorUid(usuario.uid, ahora);
  if (activas.length >= MAX_CITAS_ACTIVAS) {
    throw new Conflicto(
      `Ya tienes ${MAX_CITAS_ACTIVAS} citas activas. Cancela una antes de reservar otra.`
    );
  }

  const cita: Cita = {
    franja: idFranja(inicio),
    fecha,
    uid: usuario.uid,
    correo: usuario.correo,
    servicio: entrada.servicio,
    inicio,
    duracionMin: DURACION_MIN,
    estado: "confirmada",
    creadoEn: ahora.toISOString(),
  };

  return citasRepo.crear(cita);
}

export async function cancelarCita({
  usuario,
  franja,
  ahora = new Date(),
}: {
  usuario: Usuario;
  franja: string;
  ahora?: Date;
}): Promise<Cita> {
  const cita = await citasRepo.obtener(franja);
  if (!cita) {
    throw new NoEncontrado("Cita no encontrada");
  }

  const esDueno = cita.uid === usuario.uid;
  if (!esDueno && usuario.rol !== "admin") {
    // 404 para no revelar la existencia de citas ajenas.
    throw new NoEncontrado("Cita no encontrada");
  }

  if (horasHasta(cita.inicio, ahora) < HORAS_MIN_CANCELACION) {
    throw new Conflicto(
      `Solo puedes cancelar hasta ${HORAS_MIN_CANCELACION} horas antes de la cita`
    );
  }

  const cancelada = await citasRepo.cancelar(franja);
  if (!cancelada) {
    throw new NoEncontrado("Cita no encontrada");
  }
  return cancelada;
}

export async function listarMisCitas(usuario: Usuario, ahora = new Date()) {
  const [confirmadas, canceladas] = await Promise.all([
    citasRepo.listarPorUid(usuario.uid),
    citasRepo.listarHistorialPorUid(usuario.uid),
  ]);

  const activas = confirmadas.filter(
    (cita) => cita.estado === "confirmada" && new Date(cita.inicio).getTime() > ahora.getTime()
  );
  const finalizadas = confirmadas.filter(
    (cita) => cita.estado === "confirmada" && new Date(cita.inicio).getTime() <= ahora.getTime()
  );
  const historial = [...canceladas, ...finalizadas].sort((a, b) =>
    b.inicio.localeCompare(a.inicio)
  );

  return { activas, historial };
}

export async function listarAgenda(fecha: string) {
  return citasRepo.listarPorFecha(fecha);
}

export async function franjasOcupadas(fecha: string) {
  return citasRepo.franjasOcupadas(fecha);
}
