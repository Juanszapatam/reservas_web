import { NextResponse } from "next/server";
import { manejar } from "@/lib/http";
import {
  adminConfigurado,
  authAdmin,
  authConfigurada,
  emuladorActivo,
  firestoreAdmin,
  firestoreConfigurado,
} from "@/lib/firebase/admin";

export const GET = manejar(async () => {
  const estado = {
    adminConfigurado: adminConfigurado(),
    authConfigurada: authConfigurada(),
    firestoreConfigurado: firestoreConfigurado(),
    emuladorActivo: emuladorActivo(),
    auth: false,
    firestore: false,
  };

  if (authConfigurada()) {
    try {
      await authAdmin();
      estado.auth = true;
    } catch {
      estado.auth = false;
    }
  }

  if (firestoreConfigurado()) {
    try {
      const db = await firestoreAdmin();
      await db.collection("citas").limit(1).get();
      estado.firestore = true;
    } catch {
      estado.firestore = false;
    }
  }

  const ok = estado.auth && estado.firestore;
  return NextResponse.json(estado, { status: ok ? 200 : 503 });
});