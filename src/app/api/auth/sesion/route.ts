import { NextResponse } from "next/server";
import { z } from "zod";
import {
  crearSesionDesdeIdToken,
  requerirUsuario,
  revocarSesion,
  verificarOrigen,
} from "@/lib/auth";
import { NOMBRE_COOKIE_SESION, opcionesCookieSesion } from "@/lib/cookies";
import { leerJson, manejar, parsear } from "@/lib/http";

export const runtime = "nodejs";

const sesionSchema = z.object({ idToken: z.string().min(10) }).strict();

export const POST = manejar(async (request) => {
  verificarOrigen(request);
  const datos = await leerJson(request);
  const { idToken } = parsear(sesionSchema, datos);
  const { cookie, expiraEnMs } = await crearSesionDesdeIdToken(idToken);

  const respuesta = new NextResponse(null, { status: 204 });
  respuesta.cookies.set(NOMBRE_COOKIE_SESION, cookie, opcionesCookieSesion(expiraEnMs / 1000));
  return respuesta;
});

export const DELETE = manejar(async (request) => {
  verificarOrigen(request);

  try {
    const usuario = await requerirUsuario(request);
    await revocarSesion(usuario.uid);
  } catch {
    // Aunque la sesión ya no sea válida, se borra la cookie.
  }

  const respuesta = new NextResponse(null, { status: 204 });
  respuesta.cookies.set(NOMBRE_COOKIE_SESION, "", opcionesCookieSesion(0));
  return respuesta;
});
