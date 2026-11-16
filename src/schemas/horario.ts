import { z } from "zod";

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:MM");

export const horarioSchema = z
  .object({
    diasLaborales: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Selecciona al menos un día laboral"),
    apertura: horaSchema,
    cierre: horaSchema,
    zonaHoraria: z.string().min(1, "La zona horaria es obligatoria"),
    bloqueos: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de bloqueo inválida")),
  })
  .strict()
  .refine((h) => h.apertura < h.cierre, {
    message: "La apertura debe ser anterior al cierre",
    path: ["cierre"],
  })
  .refine(
    (h) => {
      try {
        new Intl.DateTimeFormat("es", { timeZone: h.zonaHoraria });
        return true;
      } catch {
        return false;
      }
    },
    { message: "La zona horaria no es válida", path: ["zonaHoraria"] }
  );

export type Horario = z.infer<typeof horarioSchema>;

export const horarioPorDefecto: Horario = {
  diasLaborales: [1, 2, 3, 4, 5, 6],
  apertura: "08:00",
  cierre: "17:00",
  zonaHoraria: "America/Bogota",
  bloqueos: [],
};
