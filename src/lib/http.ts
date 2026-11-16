import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DemasiadasSolicitudes,
  ErrorApi,
  ErrorValidacion,
} from "@/lib/errores";

const cubos = new Map<string, { contador: number; reinicio: number }>();

export function limitar(request: Request, maximo = 60, ventanaMs = 60_000): void {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  const ahora = Date.now();
  const cubo = cubos.get(ip);

  if (!cubo || cubo.reinicio <= ahora) {
    cubos.set(ip, { contador: 1, reinicio: ahora + ventanaMs });
    return;
  }

  cubo.contador += 1;
  if (cubo.contador > maximo) {
    throw new DemasiadasSolicitudes();
  }
}

export async function leerJson(request: Request): Promise<unknown> {
  const tipo = request.headers.get("content-type") ?? "";
  if (!tipo.includes("application/json")) {
    throw new ErrorApi(415, "El Content-Type debe ser application/json");
  }

  const texto = await request.text();
  if (texto.length > 100_000) {
    throw new ErrorApi(413, "El cuerpo de la solicitud es demasiado grande");
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorValidacion([{ campo: "cuerpo", mensaje: "JSON inválido" }]);
  }
}

export function parsear<T>(schema: z.ZodType<T>, datos: unknown): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) {
    throw new ErrorValidacion(
      resultado.error.issues.map((issue) => ({
        campo: issue.path.join(".") || "cuerpo",
        mensaje: issue.message,
      }))
    );
  }
  return resultado.data;
}

export function respuestaError(error: unknown, requestId: string): NextResponse {
  if (error instanceof ErrorApi) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.detalles ? { detalles: error.detalles } : {}),
      },
      {
        status: error.estado,
        headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
      }
    );
  }

  console.error(
    JSON.stringify({
      requestId,
      error: error instanceof Error ? error.name : "desconocido",
    })
  );

  return NextResponse.json(
    { error: "Error interno del servidor" },
    { status: 500, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } }
  );
}

type Handler<C> = (request: Request, contexto: C) => Promise<Response>;

/**
 * Envoltorio común de Route Handlers: identificador por petición, registro
 * sin datos personales y respuestas de error consistentes.
 */
export function manejar<C = unknown>(handler: Handler<C>) {
  return async (request: Request, contexto: C): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const inicio = Date.now();
    try {
      const respuesta = await handler(request, contexto);
      respuesta.headers.set("X-Request-Id", requestId);
      return respuesta;
    } catch (error) {
      return respuestaError(error, requestId);
    } finally {
      console.info(
        JSON.stringify({
          requestId,
          metodo: request.method,
          ruta: new URL(request.url).pathname,
          ms: Date.now() - inicio,
        })
      );
    }
  };
}
