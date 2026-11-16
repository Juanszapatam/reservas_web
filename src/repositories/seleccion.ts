import { firestoreConfigurado } from "@/lib/firebase/admin";

/**
 * Decide qué repositorio usar:
 * - `REPOSITORIO=memoria` fuerza los datos en memoria (demo/tests).
 * - En pruebas se usa memoria salvo `REPOSITORIO=firestore` (emulador).
 * - Con credenciales de Firebase o emulador de Firestore, usa Firestore.
 */
export function repositorioFirestoreActivo(): boolean {
  if (process.env.REPOSITORIO === "memoria") return false;
  if (process.env.NODE_ENV === "test" && process.env.REPOSITORIO !== "firestore") {
    return false;
  }
  return firestoreConfigurado();
}
