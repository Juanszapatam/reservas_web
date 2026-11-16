import { firestoreAdmin } from "@/lib/firebase/admin";
import { horarioPorDefecto, horarioSchema, type Horario } from "@/schemas/horario";

const COLECCION_CONFIG = "config";
const DOC_HORARIO = "horario";

export async function obtenerHorario(): Promise<Horario> {
  const db = await firestoreAdmin();
  const doc = await db.collection(COLECCION_CONFIG).doc(DOC_HORARIO).get();
  if (!doc.exists) return horarioPorDefecto;
  return horarioSchema.parse(doc.data());
}

export async function guardarHorario(horario: Horario): Promise<Horario> {
  const db = await firestoreAdmin();
  await db.collection(COLECCION_CONFIG).doc(DOC_HORARIO).set(horario);
  return horario;
}
