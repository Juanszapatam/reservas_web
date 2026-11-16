import { NextResponse } from "next/server";
import { esFechaISO } from "@/lib/fechas";
import { ErrorValidacion } from "@/lib/errores";
import { limitar, manejar } from "@/lib/http";
import { fechaQuerySchema } from "@/schemas/franja";
import { franjasOcupadas, obtenerHorario } from "@/services/citas";
import { generarFranjas } from "@/services/franjas";

export const runtime = "nodejs";

export const GET = manejar(async (request) => {
  limitar(request, 120, 60_000);

  const url = new URL(request.url);
  const parsed = fechaQuerySchema.safeParse({ fecha: url.searchParams.get("fecha") ?? "" });

  if (!parsed.success || !esFechaISO(parsed.data.fecha)) {
    throw new ErrorValidacion(
      parsed.success
        ? [{ campo: "fecha", mensaje: "La fecha no existe en el calendario" }]
        : parsed.error.issues.map((issue) => ({
            campo: issue.path.join("."),
            mensaje: issue.message,
          }))
    );
  }

  const { fecha } = parsed.data;
  const horario = await obtenerHorario();
  const ocupadas = await franjasOcupadas(fecha);
  const { franjas, motivo } = generarFranjas(fecha, horario, ocupadas);

  const salida = {
    fecha,
    zonaHoraria: horario.zonaHoraria,
    franjas,
    ...(motivo ? { motivo } : {}),
  };

  return NextResponse.json(salida, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
});
