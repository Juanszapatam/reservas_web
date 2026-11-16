import { describe, expect, it } from "vitest";
import { aUtc, idFranja } from "@/lib/fechas";
import { horarioPorDefecto, type Horario } from "@/schemas/horario";
import { generarFranjas } from "@/services/franjas";

const horario: Horario = { ...horarioPorDefecto };
const ZONA = horario.zonaHoraria;

function franjaDe(fecha: string, hora: string): string {
  return idFranja(aUtc(fecha, hora, ZONA).toISOString());
}

describe("generarFranjas", () => {
  it("genera franjas de 30 minutos dentro del horario", () => {
    const { franjas, motivo } = generarFranjas(
      "2026-11-16",
      horario,
      [],
      new Date("2026-11-16T12:00:00.000Z")
    );

    expect(motivo).toBeUndefined();
    expect(franjas).toHaveLength(18);
    expect(franjas[0]).toMatchObject({
      inicio: "2026-11-16T13:00:00.000Z",
      fin: "2026-11-16T13:30:00.000Z",
      estado: "libre",
      etiqueta: "08:00 - 08:30",
    });
    expect(franjas.at(-1)?.etiqueta).toBe("16:30 - 17:00");
  });

  it("marca como ocupadas las franjas ya reservadas", () => {
    const ocupada = franjaDe("2026-11-16", "11:00");
    const { franjas } = generarFranjas(
      "2026-11-16",
      horario,
      [ocupada],
      new Date("2026-11-16T12:00:00.000Z")
    );

    const franja = franjas.find((f) => f.etiqueta === "11:00 - 11:30");
    expect(franja?.estado).toBe("ocupada");
  });

  it("marca como ocupadas las franjas que ya pasaron", () => {
    // 10:00 en America/Bogota = 15:00Z
    const { franjas } = generarFranjas(
      "2026-11-16",
      horario,
      [],
      new Date("2026-11-16T15:00:00.000Z")
    );

    const ocupadas = franjas.filter((f) => f.estado === "ocupada");
    expect(ocupadas.map((f) => f.etiqueta)).toEqual([
      "08:00 - 08:30",
      "08:30 - 09:00",
      "09:00 - 09:30",
      "09:30 - 10:00",
      "10:00 - 10:30",
    ]);
    expect(franjas.find((f) => f.etiqueta === "10:30 - 11:00")?.estado).toBe("libre");
  });

  it("devuelve motivo 'pasado' cuando todo el día ya pasó", () => {
    const resultado = generarFranjas(
      "2026-11-16",
      horario,
      [],
      new Date("2026-11-16T23:30:00.000Z")
    );

    expect(resultado.franjas).toEqual([]);
    expect(resultado.motivo).toBe("pasado");
  });

  it("devuelve motivo 'dia-no-laboral' en un día sin atención", () => {
    // 2026-11-15 es domingo y el horario por defecto no abre domingo.
    const resultado = generarFranjas(
      "2026-11-15",
      horario,
      [],
      new Date("2026-11-14T12:00:00.000Z")
    );

    expect(resultado.franjas).toEqual([]);
    expect(resultado.motivo).toBe("dia-no-laboral");
  });

  it("devuelve motivo 'bloqueado' para un día bloqueado", () => {
    const resultado = generarFranjas(
      "2026-11-18",
      { ...horario, bloqueos: ["2026-11-18"] },
      [],
      new Date("2026-11-16T12:00:00.000Z")
    );

    expect(resultado.franjas).toEqual([]);
    expect(resultado.motivo).toBe("bloqueado");
  });

  it("respeta una apertura y cierre personalizados", () => {
    const { franjas } = generarFranjas(
      "2026-11-16",
      { ...horario, apertura: "09:00", cierre: "11:00" },
      [],
      new Date("2026-11-16T12:00:00.000Z")
    );

    expect(franjas.map((f) => f.etiqueta)).toEqual([
      "09:00 - 09:30",
      "09:30 - 10:00",
      "10:00 - 10:30",
      "10:30 - 11:00",
    ]);
  });
});
