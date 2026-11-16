import { NextResponse } from "next/server";
import { requerirAdmin } from "@/lib/auth";
import { esFechaISO } from "@/lib/fechas";
import { ErrorValidacion } from "@/lib/errores";
import { limitar, manejar } from "@/lib/http";
import { obtenerHorario, listarAgenda } from "@/services/citas";

export const runtime = "nodejs";

export const GET = manejar(async (request) => {
  limitar(request, 120, 60_000);
  await requerirAdmin(request);

  const fecha = new URL(request.url).searchParams.get("fecha") ?? "";
  if (!esFechaISO(fecha)) {
    throw new ErrorValidacion([{ campo: "fecha", mensaje: "La fecha no es válida" }]);
  }

  const [items, horario] = await Promise.all([listarAgenda(fecha), obtenerHorario()]);
  return NextResponse.json(
    { fecha, zonaHoraria: horario.zonaHoraria, items },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
});
