import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CitaCard } from "@/components/CitaCard";
import type { Cita } from "@/schemas/cita";

const ZONA = "America/Bogota";

function citaBase(overrides: Partial<Cita> = {}): Cita {
  return {
    franja: "2026-11-20T14-00",
    fecha: "2026-11-20",
    uid: "cliente-1",
    correo: "cliente@ejemplo.com",
    servicio: "corte",
    inicio: "2026-11-20T14:00:00.000Z",
    duracionMin: 30,
    estado: "confirmada",
    creadoEn: "2026-11-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("CitaCard", () => {
  it("muestra el servicio, el estado y el correo del titular", () => {
    render(
      <CitaCard
        cita={citaBase()}
        zonaHoraria={ZONA}
        ahora={new Date("2026-11-19T12:00:00.000Z")}
      />
    );

    expect(screen.getByRole("article", { name: /cita de corte de cabello/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Corte de cabello" })).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText(/cliente@ejemplo.com/)).toBeInTheDocument();
  });

  it("permite cancelar una cita con más de 2 horas de antelación", async () => {
    const user = userEvent.setup();
    const onCancelar = vi.fn();

    render(
      <CitaCard
        cita={citaBase()}
        zonaHoraria={ZONA}
        onCancelar={onCancelar}
        ahora={new Date("2026-11-20T10:00:00.000Z")}
      />
    );

    const boton = screen.getByRole("button", { name: "Cancelar cita" });
    expect(boton).toBeEnabled();
    await user.click(boton);
    expect(onCancelar).toHaveBeenCalledWith(expect.objectContaining({ franja: "2026-11-20T14-00" }));
  });

  it("deshabilita la cancelación si faltan menos de 2 horas", () => {
    render(
      <CitaCard
        cita={citaBase()}
        zonaHoraria={ZONA}
        onCancelar={vi.fn()}
        ahora={new Date("2026-11-20T13:00:00.000Z")}
      />
    );

    expect(screen.getByRole("button", { name: "Cancelar cita" })).toBeDisabled();
    expect(screen.getByText(/faltan menos de 2 horas/i)).toBeInTheDocument();
  });

  it("marca como finalizada una cita confirmada que ya pasó", () => {
    render(
      <CitaCard
        cita={citaBase()}
        zonaHoraria={ZONA}
        onCancelar={vi.fn()}
        ahora={new Date("2026-11-21T12:00:00.000Z")}
      />
    );

    expect(screen.getByText("Finalizada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar cita" })).not.toBeInTheDocument();
  });

  it("marca una cita cancelada y no ofrece cancelarla de nuevo", () => {
    render(
      <CitaCard
        cita={citaBase({ estado: "cancelada" })}
        zonaHoraria={ZONA}
        onCancelar={vi.fn()}
        ahora={new Date("2026-11-19T12:00:00.000Z")}
      />
    );

    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar cita" })).not.toBeInTheDocument();
  });
});
