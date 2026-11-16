import { NextResponse } from "next/server";
import { manejar, limitar } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { firestoreConfigurado, firestoreAdmin } from "@/lib/firebase/admin";
import { SEDES_POR_DEFECTO } from "@/lib/sedes";

export const GET = manejar(async (request) => {
  limitar(request, 60, 60_000);
  await requerirUsuario(request);

  if (!firestoreConfigurado()) {
    return NextResponse.json({ sedes: SEDES_POR_DEFECTO });
  }

  try {
    const db = await firestoreAdmin();
    const snapshot = await db.collection("sedes").get();
    if (snapshot.empty) {
      return NextResponse.json({ sedes: SEDES_POR_DEFECTO });
    }
    const sedes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ sedes });
  } catch {
    return NextResponse.json({ sedes: SEDES_POR_DEFECTO });
  }
});