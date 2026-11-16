import { NextResponse } from "next/server";
import { z } from "zod";
import { manejar, limitar, leerJson, parsear } from "@/lib/http";
import { requerirAdmin, verificarOrigen } from "@/lib/auth";
import { authAdmin } from "@/lib/firebase/admin";
import { Prohibido } from "@/lib/errores";

export const GET = manejar(async (request) => {
  limitar(request, 30, 60_000);
  await requerirAdmin(request);

  const auth = await authAdmin();
  const resultado = await auth.listUsers(1000);
  const usuarios = resultado.users.map((user) => ({
    uid: user.uid,
    correo: user.email ?? "",
    rol: user.customClaims?.rol === "admin" ? "admin" : "cliente",
    sede: typeof user.customClaims?.sede === "string" ? user.customClaims.sede : undefined,
    deshabilitado: user.disabled,
  }));

  return NextResponse.json({ usuarios });
});

export const PUT = manejar(async (request) => {
  limitar(request, 20, 60_000);
  verificarOrigen(request);
  const admin = await requerirAdmin(request);
  const datos = await leerJson(request);
  const { uid, rol, sede } = parsear(
    z.object({
      uid: z.string().min(1),
      rol: z.enum(["cliente", "admin"]),
      sede: z.string().min(1).optional(),
    }),
    datos
  );

  if (uid === admin.uid && rol !== "admin") {
    throw new Prohibido("No puedes quitarte a ti mismo el rol de administrador");
  }

  const auth = await authAdmin();
  await auth.setCustomUserClaims(uid, { rol, sede });
  await auth.revokeRefreshTokens(uid);

  return NextResponse.json({ usuario: { uid, rol, sede } });
});