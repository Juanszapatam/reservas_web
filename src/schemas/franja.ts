import { z } from "zod";

export const fechaQuerySchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD"),
});

export const franjaSchema = z.object({
  inicio: z.string().min(1),
  fin: z.string().min(1),
  estado: z.enum(["libre", "ocupada"]),
  etiqueta: z.string(),
});

export const motivoVacioSchema = z.enum(["dia-no-laboral", "bloqueado", "pasado", "sin-franjas"]);

export const franjasResponseSchema = z.object({
  fecha: z.string(),
  zonaHoraria: z.string(),
  franjas: z.array(franjaSchema),
  motivo: motivoVacioSchema.optional(),
});

export type Franja = z.infer<typeof franjaSchema>;
export type FranjasResponse = z.infer<typeof franjasResponseSchema>;
export type MotivoVacio = z.infer<typeof motivoVacioSchema>;
