// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/franjas/route";
import { USUARIO_DEMO_CLIENTE } from "@/lib/auth";
import { aUtc, idFranja } from "@/lib/fechas";
import { reiniciarCitas } from "@/repositories/citas";
import { reiniciarHorario } from "@/repositories/horario";
import { crearCita } from "@/services/citas";

const ZONA = "America/Bogota";
const FECHA = "2030-01-02";

// Los Route Handlers reciben (request, contexto); en las rutas sin parámetros
// el contexto no se usa, así que lo pasamos como `undefined`.
const pedirFranjas = (request: Request) => GET(request, undefined);

function pedir(fecha: string): Request {
  return new Request(`http://localhost/api/franjas?fecha=${encodeURIComponent(fecha)}`);
}

beforeEach(() => {
  reiniciarCitas();
  reiniciarHorario();
});

afterEach(() => {
  reiniciarCitas();
  reiniciarHorario();
});

describe("GET /api/franjas", () => {
  it("devuelve las franjas de un día laboral con su zona horaria", async () => {
    const res = await pedirFranjas(pedir(FECHA));
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      fecha: string;
      zonaHoraria: string;
      franjas: Array<{ etiqueta: string; estado: string; inicio: string }>;
      motivo?: string;
    };

    expect(json.fecha).toBe(FECHA);
    expect(json.zonaHoraria).toBe(ZONA);
    expect(json.motivo).toBeUndefined();
    expect(json.franjas).toHaveLength(18);
    expect(json.franjas[0]).toMatchObject({ etiqueta: "08:00 - 08:30", estado: "libre" });
    expect(json.franjas.at(-1)?.etiqueta).toBe("16:30 - 17:00");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("marca como ocupada una franja ya reservada", async () => {
    const inicio = aUtc(FECHA, "10:00", ZONA).toISOString();
    await crearCita({
      usuario: USUARIO_DEMO_CLIENTE,
      entrada: { franja: idFranja(inicio), servicio: "corte" },
    });

    const res = await pedirFranjas(pedir(FECHA));
    const json = (await res.json()) as {
      franjas: Array<{ etiqueta: string; estado: string }>;
    };

    expect(json.franjas.find((f) => f.etiqueta === "10:00 - 10:30")?.estado).toBe("ocupada");
    expect(json.franjas.find((f) => f.etiqueta === "10:30 - 11:00")?.estado).toBe("libre");
  });

  it("devuelve el motivo cuando el día no es laboral", async () => {
    // 2030-01-06 es domingo y el horario por defecto no abre los domingos.
    const res = await pedirFranjas(pedir("2030-01-06"));
    const json = (await res.json()) as { franjas: unknown[]; motivo?: string };

    expect(res.status).toBe(200);
    expect(json.franjas).toEqual([]);
    expect(json.motivo).toBe("dia-no-laboral");
  });

  it("rechaza una fecha con formato inválido", async () => {
    const res = await pedirFranjas(pedir("02/01/2030"));
    const json = (await res.json()) as { error: string; detalles: Array<{ campo: string }> };

    expect(res.status).toBe(400);
    expect(json.detalles[0]?.campo).toBe("fecha");
  });

  it("rechaza una fecha que no existe en el calendario", async () => {
    const res = await pedirFranjas(pedir("2030-02-30"));
    const json = (await res.json()) as { error: string; detalles: Array<{ mensaje: string }> };

    expect(res.status).toBe(400);
    expect(json.detalles[0]?.mensaje).toMatch(/no existe/i);
  });
});
