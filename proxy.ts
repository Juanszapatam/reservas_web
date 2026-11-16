import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// proxy.ts en Next.js 16: solo mejora UX redirigiendo si falta cookie.
// NO es la seguridad real; cada ruta/handler debe verificar la sesión.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protegidas = ["/mis-citas", "/admin"];
  const requiereSesion = protegidas.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!requiereSesion) return NextResponse.next();

  const tieneSesion = request.cookies.get("sesion");
  if (!tieneSesion) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("desde", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mis-citas/:path*", "/admin/:path*"],
};
