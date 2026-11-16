import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlotGrid } from "@/components/SlotGrid";
import type { Franja } from "@/schemas/franja";

const franjas: Franja[] = [
  { inicio: "2026-11-20T13:00:00Z", fin: "2026-11-20T13:30:00Z", estado: "libre", etiqueta: "08:00 - 08:30" },
  { inicio: "2026-11-20T13:30:00Z", fin: "2026-11-20T14:00:00Z", estado: "ocupada", etiqueta: "08:30 - 09:00" },
  { inicio: "2026-11-20T14:00:00Z", fin: "2026-11-20T14:30:00Z", estado: "libre", etiqueta: "09:00 - 09:30" },
];

describe("SlotGrid", () => {
  it("muestra las franjas como botones con su estado", () => {
    render(<SlotGrid franjas={franjas} zonaHoraria="America/Bogota" fecha="2026-11-20" />);
    expect(screen.getByRole("button", { name: /08:00 - 08:30.*disponible/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /08:30 - 09:00.*ocupada/i })).toBeInTheDocument();
  });

  it("mueve el foco con las flechas del teclado", async () => {
    const user = userEvent.setup();
    render(<SlotGrid franjas={franjas} zonaHoraria="America/Bogota" fecha="2026-11-20" />);
    const primero = screen.getByRole("button", { name: /08:00 - 08:30.*disponible/i });
    primero.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /08:30 - 09:00.*ocupada/i })).toHaveFocus();
  });

  it("no llama a onSeleccionar para una franja ocupada", async () => {
    const user = userEvent.setup();
    const onSeleccionar = vi.fn();
    render(
      <SlotGrid franjas={franjas} zonaHoraria="America/Bogota" fecha="2026-11-20" onSeleccionar={onSeleccionar} />
    );
    await user.click(screen.getByRole("button", { name: /08:30 - 09:00.*ocupada/i }));
    expect(onSeleccionar).not.toHaveBeenCalled();
  });
});
