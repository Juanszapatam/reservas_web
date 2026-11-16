import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { repositorioFirestoreActivo } from "@/repositories/seleccion";

const CLAVES = [
  "REPOSITORIO",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
] as const;

const entornoOriginal = { ...process.env };
const env = process.env as Record<string, string | undefined>;

function limpiar(): void {
  for (const clave of CLAVES) delete process.env[clave];
}

function configurarCredenciales(): void {
  process.env.FIREBASE_PROJECT_ID = "proyecto-de-prueba";
  process.env.FIREBASE_CLIENT_EMAIL = "bot@ejemplo.local";
  process.env.FIREBASE_PRIVATE_KEY = "clave-de-prueba";
}

beforeEach(() => {
  limpiar();
  env.NODE_ENV = "test";
});

afterEach(() => {
  for (const clave of CLAVES) {
    const valor = entornoOriginal[clave];
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
  env.NODE_ENV = entornoOriginal.NODE_ENV ?? "test";
});

describe("selección de repositorio", () => {
  it("usa memoria cuando no hay credenciales ni emulador", () => {
    expect(repositorioFirestoreActivo()).toBe(false);
  });

  it("REPOSITORIO=memoria tiene prioridad sobre cualquier configuración", () => {
    process.env.REPOSITORIO = "memoria";
    configurarCredenciales();
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

    expect(repositorioFirestoreActivo()).toBe(false);
  });

  it("en pruebas no toca Firestore real aunque haya credenciales", () => {
    configurarCredenciales();
    expect(repositorioFirestoreActivo()).toBe(false);
  });

  it("usa Firestore en pruebas cuando REPOSITORIO=firestore y hay emulador", () => {
    process.env.REPOSITORIO = "firestore";
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

    expect(repositorioFirestoreActivo()).toBe(true);
  });

  it("usa Firestore fuera de pruebas cuando hay credenciales reales", () => {
    env.NODE_ENV = "development";
    configurarCredenciales();

    expect(repositorioFirestoreActivo()).toBe(true);
  });

  it("vuelve a memoria fuera de pruebas si faltan credenciales", () => {
    env.NODE_ENV = "development";

    expect(repositorioFirestoreActivo()).toBe(false);
  });
});
