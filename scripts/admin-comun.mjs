import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const EMULADOR = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

/**
 * Inicializa Firebase Admin para los scripts:
 * - con `FIREBASE_AUTH_EMULATOR_HOST` usa el emulador sin credenciales reales;
 * - si no, exige `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.
 */
export function appAdminScript() {
  const existente = getApps()[0];
  if (existente) return existente;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? (EMULADOR ? "demo-reserva" : undefined);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId) {
    throw new Error("Falta FIREBASE_PROJECT_ID (o el emulador de Auth).");
  }

  if (EMULADOR) {
    return initializeApp({ projectId });
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Faltan FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY para usar Firebase real."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export function authScript() {
  return getAuth(appAdminScript());
}
