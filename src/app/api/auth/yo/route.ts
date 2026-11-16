import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { manejar } from "@/lib/http";

export const runtime = "nodejs";

export const GET = manejar(async (request) => {
  const usuario = await requerirUsuario(request);
  return NextResponse.json(
    { usuario },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
});
