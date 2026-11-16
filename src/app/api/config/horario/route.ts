import { NextResponse } from "next/server";
import { requerirAdmin, verificarOrigen } from "@/lib/auth";
import { leerJson, manejar, parsear } from "@/lib/http";
import { horarioSchema } from "@/schemas/horario";
import { actualizarHorario, obtenerHorario } from "@/services/citas";

export const runtime = "nodejs";

export const GET = manejar(async () => {
  const horario = await obtenerHorario();
  return NextResponse.json(
    { horario },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
});

export const PUT = manejar(async (request) => {
  verificarOrigen(request);
  await requerirAdmin(request);
  const datos = await leerJson(request);
  const horario = parsear(horarioSchema, datos);
  const guardado = await actualizarHorario(horario);
  return NextResponse.json({ horario: guardado }, { status: 200 });
});
