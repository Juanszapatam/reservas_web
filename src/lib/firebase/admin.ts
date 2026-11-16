import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { ErrorInterno } from "@/lib/errores";

function clavePrivada(): string | undefined {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

/** Credenciales reales de la cuenta de servicio. */
export function adminConfigurado(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      clavePrivada()
  );
}

/** Hay algún emulador de Firebase activo (Firestore o Auth). */
export function emuladorActivo(): boolean {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

/** Firestore se puede usar con credenciales reales o con el emulador. */
export function firestoreConfigurado(): boolean {
  return adminConfigurado() || Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

/** Auth se puede usar con credenciales reales o con el emulador. */
export function authConfigurada(): boolean {
  return adminConfigurado() || Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

export async function appAdmin(): Promise<App> {
  const existente = (await import("firebase-admin/app")).getApps()[0];
  if (existente) return existente;

  const emulador = emuladorActivo();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? (emulador ? "demo-reserva" : undefined);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = clavePrivada();

  if (!projectId) {
    throw new ErrorInterno("Firebase Admin no está configurado");
  }

  // Con emuladores no hacen falta credenciales reales.
  if (!clientEmail || !privateKey) {
    if (emulador) {
      const { initializeApp } = await import("firebase-admin/app");
      return initializeApp({ projectId });
    }
    throw new ErrorInterno("Firebase Admin no está configurado");
  }

  const { cert, initializeApp } = await import("firebase-admin/app");
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export async function authAdmin(): Promise<Auth> {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(await appAdmin());
}

export async function firestoreAdmin(): Promise<Firestore> {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(await appAdmin());
}
