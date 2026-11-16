import { Conflicto } from "@/lib/errores";
import { aUtc, idFranja } from "@/lib/fechas";
import type { Cita } from "@/schemas/cita";

type Store = {
  activas: Map<string, Cita>;
  historial: Map<string, Cita[]>;
  sembrado: boolean;
};

const globalConCitas = globalThis as typeof globalThis & {
  __reservaCitas?: Store;
};

function store(): Store {
  if (!globalConCitas.__reservaCitas) {
    globalConCitas.__reservaCitas = {
      activas: new Map(),
      historial: new Map(),
      sembrado: false,
    };
  }
  const s = globalConCitas.__reservaCitas;
  if (!s.sembrado) {
    s.sembrado = true;
    if (process.env.NODE_ENV !== "test") sembrarDemo(s);
  }
  return s;
}

function crearCitaDemo(fecha: string, hora: string, servicio: string, uid = "otro-cliente"): Cita {
  const inicio = aUtc(fecha, hora, "America/Bogota").toISOString();
  return {
    franja: idFranja(inicio),
    fecha,
    uid,
    correo: "otro@ejemplo.com",
    servicio,
    inicio,
    duracionMin: 30,
    estado: "confirmada",
    creadoEn: new Date().toISOString(),
  };
}

function fechaHoyNegocio(): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const mapa = Object.fromEntries(p.map((x) => [x.type, x.value]));
  return `${mapa.year}-${mapa.month}-${mapa.day}`;
}

function sembrarDemo(s: Store) {
  const hoy = fechaHoyNegocio();
  const [y, m, d] = hoy.split("-").map(Number);
  const manana = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  for (const cita of [
    crearCitaDemo(hoy, "10:00", "Corte de cabello"),
    crearCitaDemo(hoy, "15:00", "Arreglo de barba"),
    crearCitaDemo(manana, "11:00", "Corte + barba"),
  ]) {
    s.activas.set(cita.franja, cita);
  }
}

export async function obtener(franja: string): Promise<Cita | null> {
  return store().activas.get(franja) ?? null;
}

export async function listarPorFecha(fecha: string): Promise<Cita[]> {
  return [...store().activas.values()]
    .filter((c) => c.fecha === fecha && c.estado === "confirmada")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export async function listarPorUid(uid: string): Promise<Cita[]> {
  return [...store().activas.values()]
    .filter((c) => c.uid === uid)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export async function listarActivasPorUid(uid: string, ahora = new Date()): Promise<Cita[]> {
  return [...store().activas.values()]
    .filter(
      (c) =>
        c.uid === uid &&
        c.estado === "confirmada" &&
        new Date(c.inicio).getTime() > ahora.getTime()
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export async function listarHistorialPorUid(uid: string): Promise<Cita[]> {
  return [...(store().historial.get(uid) ?? [])].sort((a, b) => b.inicio.localeCompare(a.inicio));
}

export async function crear(cita: Cita): Promise<Cita> {
  const s = store();
  if (s.activas.has(cita.franja)) {
    throw new Conflicto("Esa franja ya fue reservada por otra persona");
  }
  s.activas.set(cita.franja, cita);
  return cita;
}

export async function cancelar(franja: string): Promise<Cita | null> {
  const s = store();
  const cita = s.activas.get(franja);
  if (!cita) return null;
  s.activas.delete(franja);
  const cancelada: Cita = { ...cita, estado: "cancelada" };
  const lista = s.historial.get(cita.uid) ?? [];
  lista.push(cancelada);
  s.historial.set(cita.uid, lista);
  return cancelada;
}

export function reiniciarCitas(): void {
  globalConCitas.__reservaCitas = undefined;
}

export function franjasOcupadas(fecha: string): Set<string> {
  return new Set(
    [...store().activas.values()]
      .filter((c) => c.fecha === fecha && c.estado === "confirmada")
      .map((c) => c.franja)
  );
}
