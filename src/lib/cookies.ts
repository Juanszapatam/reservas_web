export const NOMBRE_COOKIE_SESION = "sesion";

export function opcionesCookieSesion(maxAgeSegundos: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSegundos,
  };
}
