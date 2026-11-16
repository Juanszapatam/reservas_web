"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

// Host:puerto del emulador de Auth, p. ej. "127.0.0.1:9099".
const emulador = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
const urlEmulador = emulador
  ? emulador.startsWith("http")
    ? emulador
    : `http://${emulador}`
  : null;

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? (emulador ? "demo-key" : undefined),
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    (emulador ? "demo-reserva.firebaseapp.com" : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? (emulador ? "demo-reserva" : undefined),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? (emulador ? "demo-app" : undefined),
};

export function firebaseConfigurado(): boolean {
  return Boolean(
    emulador || (config.apiKey && config.authDomain && config.projectId && config.appId)
  );
}

export function appCliente(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

let emuladorConectado = false;

export function authCliente(): Auth {
  const auth = getAuth(appCliente());
  if (urlEmulador && !emuladorConectado) {
    connectAuthEmulator(auth, urlEmulador, { disableWarnings: true });
    emuladorConectado = true;
  }
  return auth;
}
