import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { limitar, manejar } from "@/lib/http";
import { listarMisCitas, obtenerHorario } from "@/services/citas";

export const runtime = "nodejs";

export const GET = manejar(async (request) => {
  limitar(request, 120, 60_000);
  const usuario = await requerirUsuario(request);
  const [{ activas, historial }, horario] = await Promise.all([
    listarMisCitas(usuario),
    obtenerHorario(),
  ]);

  const todos = [...activas, ...historial].sort((a, b) => b.inicio.localeCompare(a.inicio));
  const url = new URL(request.url);
  const limite = Math.min(Math.max(Number(url.searchParams.get("limite") ?? 20), 1), 100);
  const cursor = url.searchParams.get("cursor");
  const inicio = cursor ? todos.findIndex((c) => c.franja === cursor) + 1 : 0;
  const items = todos.slice(inicio, inicio + limite);
  const siguienteCursor = inicio + limite < todos.length ? items.at(-1)?.franja ?? null : null;

  return NextResponse.json(
    { items, siguienteCursor, activas, historial, zonaHoraria: horario.zonaHoraria },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
});
