import { Conflicto, ErrorInterno } from "@/lib/errores";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { citaSchema, type Cita } from "@/schemas/cita";

const COLECCION_CITAS = "citas";
const COLECCION_HISTORIAL = "historial";

function aCita(id: string, datos: unknown): Cita {
  const resultado = citaSchema.safeParse(datos);
  if (!resultado.success) {
    throw new ErrorInterno(`Documento de cita inválido: ${id}`);
  }
  return resultado.data;
}

export async function obtener(franja: string): Promise<Cita | null> {
  const db = await firestoreAdmin();
  const doc = await db.collection(COLECCION_CITAS).doc(franja).get();
  return doc.exists ? aCita(doc.id, doc.data()) : null;
}

export async function listarPorFecha(fecha: string): Promise<Cita[]> {
  const db = await firestoreAdmin();
  const snap = await db
    .collection(COLECCION_CITAS)
    .where("fecha", "==", fecha)
    .orderBy("inicio")
    .get();

  return snap.docs
    .map((doc) => aCita(doc.id, doc.data()))
    .filter((cita) => cita.estado === "confirmada");
}

export async function listarPorUid(uid: string): Promise<Cita[]> {
  const db = await firestoreAdmin();
  const snap = await db
    .collection(COLECCION_CITAS)
    .where("uid", "==", uid)
    .orderBy("inicio")
    .get();

  return snap.docs.map((doc) => aCita(doc.id, doc.data()));
}

export async function listarActivasPorUid(uid: string, ahora = new Date()): Promise<Cita[]> {
  const db = await firestoreAdmin();
  const snap = await db
    .collection(COLECCION_CITAS)
    .where("uid", "==", uid)
    .where("inicio", ">", ahora.toISOString())
    .orderBy("inicio")
    .get();

  return snap.docs
    .map((doc) => aCita(doc.id, doc.data()))
    .filter((cita) => cita.estado === "confirmada");
}

export async function listarHistorialPorUid(uid: string): Promise<Cita[]> {
  const db = await firestoreAdmin();
  const snap = await db
    .collection(COLECCION_HISTORIAL)
    .where("uid", "==", uid)
    .orderBy("inicio", "desc")
    .get();

  return snap.docs.map((doc) => aCita(doc.id, doc.data()));
}

/**
 * Crea la cita en una transacción: el ID del documento es la franja, así que
 * dos reservas simultáneas de la misma franja no pueden ganar las dos.
 */
export async function crear(cita: Cita): Promise<Cita> {
  const db = await firestoreAdmin();
  const ref = db.collection(COLECCION_CITAS).doc(cita.franja);

  return db.runTransaction(async (tx) => {
    const actual = await tx.get(ref);
    if (actual.exists) {
      throw new Conflicto("Esa franja ya fue reservada por otra persona");
    }
    tx.set(ref, cita);
    return cita;
  });
}

/**
 * Cancela de forma atómica: mueve la cita activa al historial y libera la
 * franja en la misma transacción.
 */
export async function cancelar(franja: string): Promise<Cita | null> {
  const db = await firestoreAdmin();
  const activaRef = db.collection(COLECCION_CITAS).doc(franja);
  const historialRef = db.collection(COLECCION_HISTORIAL).doc();

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(activaRef);
    if (!doc.exists) return null;

    const cita = aCita(doc.id, doc.data());
    const cancelada: Cita = { ...cita, estado: "cancelada" };
    tx.set(historialRef, cancelada);
    tx.delete(activaRef);
    return cancelada;
  });
}

export async function franjasOcupadas(fecha: string): Promise<Set<string>> {
  const db = await firestoreAdmin();
  const snap = await db.collection(COLECCION_CITAS).where("fecha", "==", fecha).get();
  return new Set(snap.docs.map((doc) => doc.id));
}
