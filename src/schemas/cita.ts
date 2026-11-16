import { z } from "zod";

export const estadoCitaSchema = z.enum(["confirmada", "cancelada"]);

export const citaSchema = z
  .object({
    franja: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/, "Franja inválida"),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    uid: z.string().min(1),
    correo: z.string().email(),
    servicio: z.string().min(1).max(80),
    inicio: z.string().datetime(),
    duracionMin: z.number().int().positive(),
    estado: estadoCitaSchema,
    creadoEn: z.string().datetime(),
  })
  .strict();

export type Cita = z.infer<typeof citaSchema>;

export const crearCitaSchema = z
  .object({
    franja: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/, "Franja inválida"),
    servicio: z.string().trim().min(1, "Selecciona un servicio").max(80, "Servicio demasiado largo"),
  })
  .strict();

export type CrearCitaEntrada = z.infer<typeof crearCitaSchema>;

import { SEDES_POR_DEFECTO } from "@/lib/sedes";

export const servicios = SEDES_POR_DEFECTO.flatMap((sede) => sede.servicios);

export function nombreServicio(id: string): string {
  return servicios.find((s) => s.id === id)?.nombre ?? id;
}
