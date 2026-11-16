import { NoAutorizado, Prohibido } from "@/lib/errores";
import { authConfigurada, authAdmin } from "@/lib/firebase/admin";

export type Rol = "cliente" | "admin";

export type Usuario = {
  uid: string;
  correo: string;
  rol: Rol;
};

export const USUARIO_DEMO_CLIENTE: Usuario = {
  uid: "demo-cliente",
  correo: "cliente@demo.local",
  rol: "cliente",
};

export const USUARIO_DEMO_ADMIN: Usuario = {
  uid: "demo-admin",
  correo: "admin@demo.local",
  rol: "admin",
};

export const MODO_DEMO =
  process.env.NODE_ENV !== "production" && process.env.DEMO_MODE !== "0";

function leerCookie(request: Request, nombre: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const parte of header.split(";")) {
    const [clave, ...valor] = parte.trim().split("=");
    if (clave === nombre) return decodeURIComponent(valor.join("="));
  }
  return null;
}

function usuarioDesdeClaims(uid: string, correo: string | undefined, rol: unknown): Usuario {
  return {
    uid,
    correo: correo ?? "",
    rol: rol === "admin" ? "admin" : "cliente",
  };
}

/**
 * Verifica la sesión de la petición.
 * - Cookie HttpOnly `sesion` (creada con createSessionCookie) o
 * - `Authorization: Bearer <idToken>` para pruebas/API.
 * - En desarrollo, acepta `demo-cliente`/`demo-admin` solo si MODO_DEMO.
 */
export async function requerirUsuario(request: Request): Promise<Usuario> {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const token = bearer ?? leerCookie(request, "sesion");

  if (!token) {
    throw new NoAutorizado();
  }

  if (MODO_DEMO && (token === "demo-cliente" || token === "demo-admin")) {
    return token === "demo-admin" ? USUARIO_DEMO_ADMIN : USUARIO_DEMO_CLIENTE;
  }

  if (!authConfigurada()) {
    throw new NoAutorizado("La autenticación no está configurada en este entorno");
  }

  try {
    const auth = await authAdmin();
    const decoded = bearer
      ? await auth.verifyIdToken(bearer, true)
      : await auth.verifySessionCookie(token, true);
    return usuarioDesdeClaims(decoded.uid, decoded.email, decoded.rol);
  } catch {
    throw new NoAutorizado("Sesión inválida o vencida");
  }
}

export async function requerirAdmin(request: Request): Promise<Usuario> {
  const usuario = await requerirUsuario(request);
  if (usuario.rol !== "admin") {
    throw new Prohibido("Solo el administrador puede realizar esta acción");
  }
  return usuario;
}

export async function crearSesionDesdeIdToken(idToken: string): Promise<{
  cookie: string;
  uid: string;
  rol: Rol;
  expiraEnMs: number;
}> {
  if (!authConfigurada()) {
    throw new NoAutorizado("La autenticación no está configurada en este entorno");
  }

  const auth = await authAdmin();
  const decoded = await auth.verifyIdToken(idToken, true);
  const authTime = decoded.auth_time ?? 0;
  const ahoraSegundos = Math.floor(Date.now() / 1000);
  if (ahoraSegundos - authTime > 5 * 60) {
    throw new NoAutorizado("El inicio de sesión es muy antiguo. Vuelve a iniciar sesión.");
  }

  const expiraEnMs = 5 * 24 * 60 * 60 * 1000;
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: expiraEnMs });
  return {
    cookie,
    uid: decoded.uid,
    rol: decoded.rol === "admin" ? "admin" : "cliente",
    expiraEnMs,
  };
}

export async function revocarSesion(uid: string): Promise<void> {
  if (!authConfigurada()) return;
  const auth = await authAdmin();
  await auth.revokeRefreshTokens(uid);
}

/**
 * Defensa CSRF: si el navegador envía Origin, debe coincidir con el host.
 * Los clientes de API (Bruno/Postman) pueden omitirlo.
 */
export function verificarOrigen(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const host = request.headers.get("host");
  if (!host) throw new Prohibido("Origen no permitido");

  let origenEsperado: string;
  try {
    const url = new URL(origin);
    const protocolo =
      request.headers.get("x-forwarded-proto") ??
      (url.protocol === "https:" ? "https" : "http");
    origenEsperado = `${protocolo}://${host}`;
  } catch {
    throw new Prohibido("Origen no permitido");
  }

  if (origin !== origenEsperado) {
    throw new Prohibido("Origen no permitido");
  }
}
