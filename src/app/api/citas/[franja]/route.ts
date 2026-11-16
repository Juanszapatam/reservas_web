import { NextResponse } from "next/server";
import { requerirUsuario, verificarOrigen } from "@/lib/auth";
import { manejar } from "@/lib/http";
import { ErrorValidacion } from "@/lib/errores";
import { cancelarCita } from "@/services/citas";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ franja: string }> };

export const DELETE = manejar<Contexto>(async (request, contexto) => {
  verificarOrigen(request);
  const { franja } = await contexto.params;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/.test(franja)) {
    throw new ErrorValidacion([{ campo: "franja", mensaje: "Identificador de franja inválido" }]);
  }

  const usuario = await requerirUsuario(request);
  const cita = await cancelarCita({ usuario, franja });
  return NextResponse.json({ cita }, { status: 200 });
});
