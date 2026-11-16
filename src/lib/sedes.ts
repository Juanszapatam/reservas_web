export type Servicio = {
  id: string;
  nombre: string;
  duracionMin: number;
};

export type Sede = {
  id: string;
  nombre: string;
  tipoNegocio: "barberia" | "consultorio";
  servicios: Servicio[];
};

export const SEDES_POR_DEFECTO: Sede[] = [
  {
    id: "barberia",
    nombre: "Barbería",
    tipoNegocio: "barberia",
    servicios: [
      { id: "corte", nombre: "Corte de cabello", duracionMin: 30 },
      { id: "barba", nombre: "Arreglo de barba", duracionMin: 30 },
      { id: "corte-barba", nombre: "Corte + barba", duracionMin: 30 },
    ],
  },
  {
    id: "consultorio",
    nombre: "Consultorio",
    tipoNegocio: "consultorio",
    servicios: [
      { id: "consulta-general", nombre: "Consulta general", duracionMin: 30 },
      { id: "control", nombre: "Control", duracionMin: 30 },
      { id: "valoracion", nombre: "Valoración", duracionMin: 30 },
    ],
  },
];

export function obtenerSedePorId(id?: string | null): Sede | undefined {
  return SEDES_POR_DEFECTO.find((s) => s.id === id);
}

export function serviciosPorSede(id?: string | null): Servicio[] {
  return obtenerSedePorId(id)?.servicios ?? SEDES_POR_DEFECTO[0].servicios;
}