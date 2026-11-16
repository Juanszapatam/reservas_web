// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as CREAR_SESION } from "@/app/api/auth/sesion/route";
import { GET as LEER_SESION } from "@/app/api/auth/yo/route";
import { crearSesionDesdeIdToken, requerirAdmin, requerirUsuario } from "@/lib/auth";
import { NoAutorizado, Prohibido } from "@/lib/errores";

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "";
const activo = process.env.EMULADOR_TEST === "1" && Boolean(host);
const describir = activo ? describe : describe.skip;

const sufijo = Date.now().toString(36);
const correoAdmin = `admin-${sufijo}@demo.local`;
const correoCliente = `cliente-${sufijo}@demo.local`;
const clave = "demo1234";

let uidAdmin = "";
let uidCliente = "";

async function authEmulador() {
  const { authAdmin } = await import("@/lib/firebase/admin");
  return authAdmin();
}

/** Obtiene un idToken real del emulador a partir de un custom token. */
async function idTokenDe(uid: string, claims?: Record<string, unknown>): Promise<string> {
  const auth = await authEmulador();
  const token = await auth.createCustomToken(uid, claims);
  const res = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, returnSecureToken: true }),
    }
  );
  const json = (await res.json()) as {
    idToken?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.idToken) {
    throw new Error(`El emulador rechazó el inicio de sesión: ${json.error?.message ?? res.status}`);
  }
  return json.idToken;
}

function peticionConCookie(cookie: string): Request {
  return new Request("http://localhost/api/auth/yo", { headers: { cookie } });
}

beforeAll(async () => {
  if (!activo) return;
  const auth = await authEmulador();
  const admin = await auth.createUser({ email: correoAdmin, password: clave });
  const cliente = await auth.createUser({ email: correoCliente, password: clave });
  uidAdmin = admin.uid;
  uidCliente = cliente.uid;
  await auth.setCustomUserClaims(uidAdmin, { rol: "admin" });
}, 30_000);

afterAll(async () => {
  if (!activo) return;
  const auth = await authEmulador();
  await Promise.all([
    auth.deleteUser(uidAdmin).catch(() => undefined),
    auth.deleteUser(uidCliente).catch(() => undefined),
  ]);
});

describir("Auth real contra el emulador", () => {
  it("POST /api/auth/sesion crea la cookie y /api/auth/yo devuelve el rol", async () => {
    const idToken = await idTokenDe(uidAdmin, { rol: "admin" });

    const respuesta = await CREAR_SESION(
      new Request("http://localhost/api/auth/sesion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      }),
      undefined
    );

    expect(respuesta.status).toBe(204);
    const cookie = respuesta.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("sesion=");
    expect(cookie.toLowerCase()).toContain("httponly");

    const yo = await LEER_SESION(peticionConCookie(cookie), undefined);
    expect(yo.status).toBe(200);
    const json = (await yo.json()) as { usuario: { uid: string; rol: string } };
    expect(json.usuario).toMatchObject({ uid: uidAdmin, rol: "admin" });
  }, 30_000);

  it("crearSesionDesdeIdToken genera una cookie válida para requerirAdmin", async () => {
    const idToken = await idTokenDe(uidAdmin, { rol: "admin" });
    const { cookie, rol, expiraEnMs } = await crearSesionDesdeIdToken(idToken);

    expect(rol).toBe("admin");
    expect(expiraEnMs).toBeGreaterThan(0);

    const sesion = peticionConCookie(`sesion=${cookie}`);
    await expect(requerirUsuario(sesion)).resolves.toMatchObject({ uid: uidAdmin, rol: "admin" });
    await expect(requerirAdmin(sesion)).resolves.toMatchObject({ uid: uidAdmin });
  }, 30_000);

  it("un cliente pasa la autenticación pero no la autorización de admin", async () => {
    const idToken = await idTokenDe(uidCliente);
    const { cookie, rol } = await crearSesionDesdeIdToken(idToken);

    expect(rol).toBe("cliente");

    const sesion = peticionConCookie(`sesion=${cookie}`);
    await expect(requerirUsuario(sesion)).resolves.toMatchObject({ uid: uidCliente, rol: "cliente" });
    await expect(requerirAdmin(sesion)).rejects.toBeInstanceOf(Prohibido);
  }, 30_000);

  it("rechaza una cookie de sesión inválida", async () => {
    await expect(
      requerirUsuario(peticionConCookie("sesion=cookie-invalida"))
    ).rejects.toBeInstanceOf(NoAutorizado);
  });
});
