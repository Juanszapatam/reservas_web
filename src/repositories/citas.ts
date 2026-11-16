import type { Cita } from "@/schemas/cita";
import * as firestore from "./citas.firestore";
import * as memoria from "./citas.memoria";
import { repositorioFirestoreActivo } from "./seleccion";

function usarFirestore(): boolean {
  return repositorioFirestoreActivo();
}

export async function obtener(franja: string): Promise<Cita | null> {
  return usarFirestore() ? firestore.obtener(franja) : memoria.obtener(franja);
}

export async function listarPorFecha(fecha: string): Promise<Cita[]> {
  return usarFirestore() ? firestore.listarPorFecha(fecha) : memoria.listarPorFecha(fecha);
}

export async function listarPorUid(uid: string): Promise<Cita[]> {
  return usarFirestore() ? firestore.listarPorUid(uid) : memoria.listarPorUid(uid);
}

export async function listarActivasPorUid(uid: string, ahora = new Date()): Promise<Cita[]> {
  return usarFirestore()
    ? firestore.listarActivasPorUid(uid, ahora)
    : memoria.listarActivasPorUid(uid, ahora);
}

export async function listarHistorialPorUid(uid: string): Promise<Cita[]> {
  return usarFirestore()
    ? firestore.listarHistorialPorUid(uid)
    : memoria.listarHistorialPorUid(uid);
}

export async function crear(cita: Cita): Promise<Cita> {
  return usarFirestore() ? firestore.crear(cita) : memoria.crear(cita);
}

export async function cancelar(franja: string): Promise<Cita | null> {
  return usarFirestore() ? firestore.cancelar(franja) : memoria.cancelar(franja);
}

export async function franjasOcupadas(fecha: string): Promise<Set<string>> {
  return usarFirestore()
    ? firestore.franjasOcupadas(fecha)
    : Promise.resolve(memoria.franjasOcupadas(fecha));
}

/**
 * Solo afecta a los datos en memoria. Firestore no se borra desde la app;
 * para el emulador se limpia con `firebase emulators:exec`.
 */
export function reiniciarCitas(): void {
  memoria.reiniciarCitas();
}
