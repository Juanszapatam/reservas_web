import { NextResponse } from "next/server";
import { z } from "zod";
import { MODO_DEMO } from "@/lib/auth";
import { NOMBRE_COOKIE_SESION, opcionesCookieSesion } from "@/lib/cookies";
import { leerJson, manejar, parsear } from "@/lib/http";
import { NoEncontrado } from "@/lib/errores";

export const runtime = "nodejs";

const demoSchema = z.object({ rol: z.enum(["cliente", "admin"]) }).strict();

export const POST = manejar(async (request) => {
  if (!MODO_DEMO) {
    throw new NoEncontrado("No disponible");
  }

  const datos = await leerJson(request);
  const { rol } = parsear(demoSchema, datos);
  const respuesta = new NextResponse(null, { status: 204 });
  respuesta.cookies.set(
    NOMBRE_COOKIE_SESION,
    rol === "admin" ? "demo-admin" : "demo-cliente",
    opcionesCookieSesion(5 * 24 * 60 * 60)
  );
  return respuesta;
});

export const DELETE = manejar(async () => {
  if (!MODO_DEMO) {
    throw new NoEncontrado("No disponible");
  }
  const respuesta = new NextResponse(null, { status: 204 });
  respuesta.cookies.set(NOMBRE_COOKIE_SESION, "", opcionesCookieSesion(0));
  return respuesta;
});
