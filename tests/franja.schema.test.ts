import { describe, expect, it } from "vitest";
import { fechaQuerySchema } from "@/schemas/franja";

describe("fechaQuerySchema", () => {
  it("acepta una fecha válida YYYY-MM-DD", () => {
    const r = fechaQuerySchema.safeParse({ fecha: "2026-11-10" });
    expect(r.success).toBe(true);
  });

  it("rechaza formatos inválidos", () => {
    const r = fechaQuerySchema.safeParse({ fecha: "10-11-2026" });
    expect(r.success).toBe(false);
  });
});
