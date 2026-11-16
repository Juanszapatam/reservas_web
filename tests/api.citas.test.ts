// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as GET_AGENDA } from "@/app/api/admin/agenda/route";
import { GET as GET_MIS_CITAS } from "@/app/api/mis-citas/route";
import { DELETE } from "@/app/api/citas/[franja]/route";
import { POST } from "@/app/api/citas/route";
import { aUtc, idFranja } from "@/lib/fechas";
import { reiniciarCitas } from "@/repositories/citas";
import { reiniciarHorario } from "@/repositories/horario";
import type { Cita } from "@/schemas/cita";

const ZONA = "America/Bogota";
const FECHA = "2030-01-02";

const COOKIE_CLIENTE = "sesion=demo-cliente";
const COOKIE_ADMIN = "sesion=demo-admin";

function franja(fecha: string, hora: string): string {
  return idFranja(aUtc(fecha, hora, ZONA).toISOString());
}

// Los Route Handlers reciben (request, contexto); en las rutas sin parámetros
// el contexto no se usa, así que lo pasamos como `undefined`.
const crear = (request: Request) => POST(request, undefined);
const listarMisCitas = (request: Request) => GET_MIS_CITAS(request, undefined);
const verAgenda = (request: Request) => GET_AGENDA(request, undefined);

function postCita(cuerpo: unknown, cookie?: string): Request {
  return new Request("http://localhost/api/citas", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
}

function borrarCita(franjaId: string, cookie?: string): Request {
  return new Request(`http://localhost/api/citas/${franjaId}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
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

describe("POST /api/citas", () => {
  it("crea una cita para el cliente autenticado", async () => {
    const res = await crear(
      postCita({ franja: franja(FECHA, "10:00"), servicio: "corte" }, COOKIE_CLIENTE)
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as { cita: Cita };
    expect(json.cita).toMatchObject({
      fecha: FECHA,
      uid: "demo-cliente",
      estado: "confirmada",
      servicio: "corte",
      duracionMin: 30,
    });
  });

  it("exige sesión", async () => {
    const res = await crear(postCita({ franja: franja(FECHA, "10:00"), servicio: "corte" }));
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/sesión/i);
  });

  it("rechaza datos inválidos con detalles por campo", async () => {
    const res = await crear(postCita({ franja: "2019-01-01", servicio: "" }, COOKIE_CLIENTE));

    expect(res.status).toBe(400);
    const json = (await res.json()) as { detalles: Array<{ campo: string }> };
    const campos = json.detalles.map((d) => d.campo);
    expect(campos).toContain("franja");
    expect(campos).toContain("servicio");
  });

  it("rechaza un Content-Type que no sea JSON", async () => {
    const res = await crear(
      new Request("http://localhost/api/citas", {
        method: "POST",
        headers: { "content-type": "text/plain", cookie: COOKIE_CLIENTE },
        body: JSON.stringify({ franja: franja(FECHA, "10:00"), servicio: "corte" }),
      })
    );

    expect(res.status).toBe(415);
  });

  it("impide reservar dos veces la misma franja", async () => {
    const entrada = { franja: franja(FECHA, "10:00"), servicio: "corte" };
    expect((await crear(postCita(entrada, COOKIE_CLIENTE))).status).toBe(201);

    const res = await crear(postCita(entrada, COOKIE_ADMIN));
    expect(res.status).toBe(409);
  });

  it("bloquea un Origin ajeno (CSRF)", async () => {
    const res = await crear(
      new Request("http://localhost/api/citas", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: COOKIE_CLIENTE,
          origin: "https://malicioso.example",
          host: "localhost",
        },
        body: JSON.stringify({ franja: franja(FECHA, "10:00"), servicio: "corte" }),
      })
    );

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/citas/[franja]", () => {
  it("cancela una cita propia con antelación suficiente", async () => {
    const id = franja(FECHA, "10:00");
    expect((await crear(postCita({ franja: id, servicio: "corte" }, COOKIE_CLIENTE))).status).toBe(201);

    const res = await DELETE(borrarCita(id, COOKIE_CLIENTE), {
      params: Promise.resolve({ franja: id }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cita: Cita };
    expect(json.cita.estado).toBe("cancelada");
  });

  it("devuelve 404 si la cita no existe", async () => {
    const res = await DELETE(borrarCita(franja(FECHA, "11:00"), COOKIE_CLIENTE), {
      params: Promise.resolve({ franja: franja(FECHA, "11:00") }),
    });

    expect(res.status).toBe(404);
  });

  it("permite al administrador cancelar la cita de un cliente", async () => {
    const id = franja(FECHA, "10:00");
    await crear(postCita({ franja: id, servicio: "corte" }, COOKIE_CLIENTE));

    const res = await DELETE(borrarCita(id, COOKIE_ADMIN), {
      params: Promise.resolve({ franja: id }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cita: Cita };
    expect(json.cita.estado).toBe("cancelada");
  });

  it("rechaza un identificador de franja inválido", async () => {
    const res = await DELETE(borrarCita("no-es-franja", COOKIE_CLIENTE), {
      params: Promise.resolve({ franja: "no-es-franja" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/mis-citas", () => {
  it("lista las citas activas del usuario autenticado", async () => {
    const id = franja(FECHA, "10:00");
    await crear(postCita({ franja: id, servicio: "corte" }, COOKIE_CLIENTE));

    const res = await listarMisCitas(
      new Request("http://localhost/api/mis-citas", { headers: { cookie: COOKIE_CLIENTE } })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { activas: Cita[]; zonaHoraria: string };
    expect(json.zonaHoraria).toBe(ZONA);
    expect(json.activas.map((c) => c.franja)).toContain(id);
  });

  it("exige sesión", async () => {
    const res = await listarMisCitas(new Request("http://localhost/api/mis-citas"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/agenda", () => {
  it("permite al administrador consultar la agenda del día", async () => {
    const id = franja(FECHA, "10:00");
    await crear(postCita({ franja: id, servicio: "corte" }, COOKIE_CLIENTE));

    const res = await verAgenda(
      new Request(`http://localhost/api/admin/agenda?fecha=${FECHA}`, {
        headers: { cookie: COOKIE_ADMIN },
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { fecha: string; items: Cita[] };
    expect(json.fecha).toBe(FECHA);
    expect(json.items).toHaveLength(1);
  });

  it("prohíbe la agenda a un cliente (403)", async () => {
    const res = await verAgenda(
      new Request(`http://localhost/api/admin/agenda?fecha=${FECHA}`, {
        headers: { cookie: COOKIE_CLIENTE },
      })
    );

    expect(res.status).toBe(403);
  });

  it("exige sesión (401)", async () => {
    const res = await verAgenda(
      new Request(`http://localhost/api/admin/agenda?fecha=${FECHA}`)
    );

    expect(res.status).toBe(401);
  });
});
