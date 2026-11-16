// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aUtc, idFranja } from "@/lib/fechas";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { Conflicto } from "@/lib/errores";
import type { Cita } from "@/schemas/cita";
import { horarioPorDefecto, type Horario } from "@/schemas/horario";
import * as citas from "@/repositories/citas";
import * as horario from "@/repositories/horario";
import { repositorioFirestoreActivo } from "@/repositories/seleccion";

const activo =
  process.env.EMULADOR_TEST === "1" &&
  Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
  repositorioFirestoreActivo();
const describir = activo ? describe : describe.skip;

const ZONA = horarioPorDefecto.zonaHoraria;
const UID = `integracion-${Date.now().toString(36)}`;

function crearCita(fecha: string, hora: string, sufijo = ""): Cita {
  const inicio = aUtc(fecha, hora, ZONA).toISOString();
  return {
    franja: idFranja(inicio),
    fecha,
    uid: `${UID}${sufijo}`,
    correo: `${UID}${sufijo}@ejemplo.com`,
    servicio: "corte",
    inicio,
    duracionMin: 30,
    estado: "confirmada",
    creadoEn: new Date().toISOString(),
  };
}

async function limpiar(): Promise<void> {
  const db = await firestoreAdmin();
  const snapshots = await Promise.all([
    db.collection("citas").where("uid", ">=", UID).where("uid", "<", `${UID}\uf8ff`).get(),
    db.collection("historial").where("uid", ">=", UID).where("uid", "<", `${UID}\uf8ff`).get(),
  ]);
  const lote = db.batch();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) lote.delete(doc.ref);
  }
  await lote.commit();
  await db.collection("config").doc("horario").delete();
}

beforeAll(async () => {
  if (activo) await limpiar();
}, 30_000);

afterAll(async () => {
  if (activo) await limpiar();
}, 30_000);

describir("Repositorio de citas sobre Firestore", () => {
  it("guarda una cita y la recupera por franja y por usuario", async () => {
    const cita = crearCita("2030-01-02", "10:00");

    await citas.crear(cita);

    await expect(citas.obtener(cita.franja)).resolves.toMatchObject({
      franja: cita.franja,
      uid: cita.uid,
      estado: "confirmada",
    });
    const propias = await citas.listarPorUid(cita.uid);
    expect(propias.map((c) => c.franja)).toContain(cita.franja);
  }, 30_000);

  it("impide que dos reservas simultáneas de la misma franja ganen las dos", async () => {
    const primera = crearCita("2030-01-02", "11:00", "-a");
    const segunda = crearCita("2030-01-02", "11:00", "-b");

    const resultados = await Promise.allSettled([citas.crear(primera), citas.crear(segunda)]);

    const exitosas = resultados.filter((r) => r.status === "fulfilled");
    const fallidas = resultados.filter((r) => r.status === "rejected");
    expect(exitosas).toHaveLength(1);
    expect(fallidas).toHaveLength(1);
    expect((fallidas[0] as PromiseRejectedResult).reason).toBeInstanceOf(Conflicto);

    const guardada = await citas.obtener(primera.franja);
    const ganadora = exitosas[0] as PromiseFulfilledResult<Cita>;
    expect(guardada?.uid).toBe(ganadora.value.uid);
  }, 30_000);

  it("cancelar mueve la cita al historial y libera la franja de forma atómica", async () => {
    const cita = crearCita("2030-01-03", "09:00");
    await citas.crear(cita);

    const cancelada = await citas.cancelar(cita.franja);

    expect(cancelada).toMatchObject({ franja: cita.franja, estado: "cancelada" });
    await expect(citas.obtener(cita.franja)).resolves.toBeNull();
    const historial = await citas.listarHistorialPorUid(cita.uid);
    expect(historial.map((c) => c.franja)).toContain(cita.franja);
  }, 30_000);

  it("persiste el horario en config/horario y devuelve el valor por defecto si no existe", async () => {
    await expect(horario.obtenerHorario()).resolves.toEqual(horarioPorDefecto);

    const personalizado: Horario = {
      ...horarioPorDefecto,
      apertura: "09:00",
      cierre: "18:00",
      bloqueos: ["2030-01-06"],
    };
    await horario.guardarHorario(personalizado);

    await expect(horario.obtenerHorario()).resolves.toEqual(personalizado);
  }, 30_000);
});
