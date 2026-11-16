import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { aUtc, idFranja } from "@/lib/fechas";
import { Conflicto, NoEncontrado, Vencido } from "@/lib/errores";
import type { Usuario } from "@/lib/auth";
import { reiniciarCitas } from "@/repositories/citas";
import { reiniciarHorario } from "@/repositories/horario";
import { horarioPorDefecto } from "@/schemas/horario";
import {
  HORAS_MIN_CANCELACION,
  MAX_CITAS_ACTIVAS,
  cancelarCita,
  crearCita,
  listarMisCitas,
} from "@/services/citas";

const ZONA = horarioPorDefecto.zonaHoraria;
// 18:00Z = 13:00 en America/Bogota: mitad de la jornada del 16/11.
const AHORA = new Date("2026-11-16T18:00:00.000Z");

const cliente: Usuario = { uid: "cliente-1", correo: "cliente@ejemplo.com", rol: "cliente" };
const otroCliente: Usuario = { uid: "cliente-2", correo: "otro@ejemplo.com", rol: "cliente" };
const admin: Usuario = { uid: "admin-1", correo: "admin@ejemplo.com", rol: "admin" };

function franja(fecha: string, hora: string): string {
  return idFranja(aUtc(fecha, hora, ZONA).toISOString());
}

function reservar(usuario: Usuario, fecha: string, hora: string, ahora = AHORA) {
  return crearCita({
    usuario,
    entrada: { franja: franja(fecha, hora), servicio: "corte" },
    ahora,
  });
}

beforeEach(() => {
  reiniciarCitas();
  reiniciarHorario();
});

afterEach(() => {
  reiniciarCitas();
  reiniciarHorario();
});

describe("crearCita", () => {
  it("crea una cita confirmada con los datos del usuario y la franja", async () => {
    const cita = await reservar(cliente, "2026-11-16", "14:00");

    expect(cita).toMatchObject({
      franja: franja("2026-11-16", "14:00"),
      fecha: "2026-11-16",
      uid: "cliente-1",
      correo: "cliente@ejemplo.com",
      servicio: "corte",
      inicio: "2026-11-16T19:00:00.000Z",
      duracionMin: 30,
      estado: "confirmada",
      creadoEn: AHORA.toISOString(),
    });
  });

  it("rechaza una franja inválida", async () => {
    await expect(
      crearCita({ usuario: cliente, entrada: { franja: "no-es-franja", servicio: "corte" }, ahora: AHORA })
    ).rejects.toBeInstanceOf(Conflicto);
  });

  it("rechaza una franja que ya pasó", async () => {
    await expect(reservar(cliente, "2026-11-16", "08:00")).rejects.toBeInstanceOf(Conflicto);
  });

  it("devuelve Vencido cuando el día completo ya pasó", async () => {
    // 23:30Z ya es después del cierre (17:00 en Bogotá).
    await expect(
      reservar(cliente, "2026-11-16", "14:00", new Date("2026-11-16T23:30:00.000Z"))
    ).rejects.toBeInstanceOf(Vencido);
  });

  it("rechaza una franja fuera del horario del negocio", async () => {
    await expect(reservar(cliente, "2026-11-16", "20:00")).rejects.toBeInstanceOf(Conflicto);
  });

  it("rechaza una franja ya reservada por otra persona", async () => {
    await reservar(cliente, "2026-11-16", "14:00");
    await expect(reservar(otroCliente, "2026-11-16", "14:00")).rejects.toThrow(
      /ya fue reservada/i
    );
  });

  it(`no permite más de ${MAX_CITAS_ACTIVAS} citas activas por usuario`, async () => {
    await reservar(cliente, "2026-11-16", "14:00");
    await reservar(cliente, "2026-11-16", "15:00");

    await expect(reservar(cliente, "2026-11-17", "09:00")).rejects.toThrow(
      /citas activas/i
    );
  });

  it("permite reservar a otro usuario aunque el primero tenga dos activas", async () => {
    await reservar(cliente, "2026-11-16", "14:00");
    await reservar(cliente, "2026-11-16", "15:00");

    await expect(reservar(otroCliente, "2026-11-17", "09:00")).resolves.toMatchObject({
      uid: "cliente-2",
    });
  });
});

describe("listarMisCitas", () => {
  it("incluye las citas pasadas en el historial para mostrarlas como finalizadas", async () => {
    const cita = await reservar(cliente, "2026-11-16", "13:30");

    const { activas, historial } = await listarMisCitas(
      cliente,
      new Date("2026-11-16T19:00:00.000Z")
    );

    expect(activas).toHaveLength(0);
    expect(historial.map((c) => c.franja)).toContain(cita.franja);
  });
});

describe("cancelarCita", () => {
  it("cancela una cita propia con más de 2 horas de antelación y la pasa al historial", async () => {
    const cita = await reservar(cliente, "2026-11-17", "09:00");

    const cancelada = await cancelarCita({ usuario: cliente, franja: cita.franja, ahora: AHORA });

    expect(cancelada.estado).toBe("cancelada");
    const { activas, historial } = await listarMisCitas(cliente, AHORA);
    expect(activas).toHaveLength(0);
    expect(historial.map((c) => c.franja)).toContain(cita.franja);
  });

  it(`rechaza cancelar cuando faltan menos de ${HORAS_MIN_CANCELACION} horas`, async () => {
    const cita = await reservar(cliente, "2026-11-16", "13:30");

    await expect(
      cancelarCita({ usuario: cliente, franja: cita.franja, ahora: AHORA })
    ).rejects.toBeInstanceOf(Conflicto);
  });

  it("oculta con 404 las citas de otra persona a un cliente", async () => {
    const cita = await reservar(cliente, "2026-11-17", "09:00");

    await expect(
      cancelarCita({ usuario: otroCliente, franja: cita.franja, ahora: AHORA })
    ).rejects.toBeInstanceOf(NoEncontrado);

    const { activas } = await listarMisCitas(cliente, AHORA);
    expect(activas).toHaveLength(1);
  });

  it("permite al administrador cancelar citas ajenas", async () => {
    const cita = await reservar(cliente, "2026-11-17", "09:00");

    const cancelada = await cancelarCita({ usuario: admin, franja: cita.franja, ahora: AHORA });

    expect(cancelada.estado).toBe("cancelada");
  });

  it("devuelve 404 cuando la cita no existe", async () => {
    await expect(
      cancelarCita({ usuario: cliente, franja: franja("2026-11-17", "10:00"), ahora: AHORA })
    ).rejects.toBeInstanceOf(NoEncontrado);
  });
});
