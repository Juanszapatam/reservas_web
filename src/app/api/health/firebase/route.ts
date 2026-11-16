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
  const estado: {
    adminConfigurado: boolean;
    authConfigurada: boolean;
    firestoreConfigurado: boolean;
    emuladorActivo: boolean;
    auth: boolean;
    firestore: boolean;
    authError?: string;
    firestoreError?: string;
  } = {
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
    } catch (error) {
      estado.auth = false;
      estado.authError = error instanceof Error ? error.message : "Error desconocido";
    }
  }

  if (firestoreConfigurado()) {
    try {
      const db = await firestoreAdmin();
      await db.collection("citas").limit(1).get();
      estado.firestore = true;
    } catch (error) {
      estado.firestore = false;
      estado.firestoreError = error instanceof Error ? error.message : "Error desconocido";
    }
  }

  const ok = estado.auth && estado.firestore;
  return NextResponse.json(estado, { status: ok ? 200 : 503 });
});