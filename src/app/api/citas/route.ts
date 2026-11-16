import { NextResponse } from "next/server";
import { requerirUsuario, verificarOrigen } from "@/lib/auth";
import { leerJson, limitar, manejar, parsear } from "@/lib/http";
import { crearCitaSchema } from "@/schemas/cita";
import { crearCita } from "@/services/citas";

export const runtime = "nodejs";

export const POST = manejar(async (request) => {
  verificarOrigen(request);
  limitar(request, 20, 60_000);

  const usuario = await requerirUsuario(request);
  const datos = await leerJson(request);
  const entrada = parsear(crearCitaSchema, datos);
  const cita = await crearCita({ usuario, entrada });

  return NextResponse.json({ cita }, { status: 201 });
});
