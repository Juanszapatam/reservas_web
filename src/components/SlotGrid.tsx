"use client";

import { useEffect, useRef, useState } from "react";
import type { Franja } from "@/schemas/franja";
import { HoraLocal } from "@/components/HoraLocal";
import styles from "./SlotGrid.module.css";

type Props = {
  franjas: Franja[];
  zonaHoraria: string;
  fecha: string;
  onSeleccionar?: (franja: Franja) => void;
};

function useColumnas() {
  const [cols, setCols] = useState(1);

  useEffect(() => {
    const grande = window.matchMedia("(min-width: 1024px)");
    const mediano = window.matchMedia("(min-width: 768px)");
    const actualizar = () => setCols(grande.matches ? 3 : mediano.matches ? 2 : 1);
    actualizar();
    grande.addEventListener("change", actualizar);
    mediano.addEventListener("change", actualizar);
    return () => {
      grande.removeEventListener("change", actualizar);
      mediano.removeEventListener("change", actualizar);
    };
  }, []);

  return cols;
}

export function SlotGrid({ franjas, zonaHoraria, fecha, onSeleccionar }: Props) {
  const cols = useColumnas();
  const cellsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const filas: Franja[][] = [];
  for (let i = 0; i < franjas.length; i += cols) {
    filas.push(franjas.slice(i, i + cols));
  }

  const moverFoco = (index: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const max = franjas.length - 1;
    let next = index;
    if (e.key === "ArrowRight") next = Math.min(index + 1, max);
    else if (e.key === "ArrowLeft") next = Math.max(index - 1, 0);
    else if (e.key === "ArrowDown") next = Math.min(index + cols, max);
    else if (e.key === "ArrowUp") next = Math.max(index - cols, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = max;
    else return;
    e.preventDefault();
    cellsRef.current[next]?.focus();
  };

  return (
    <section aria-label={`Franjas del ${fecha}`}>
      <p className={styles.meta}>
        Zona horaria del negocio: <strong>{zonaHoraria}</strong>
      </p>
      <div
        className={styles.grid}
        role="grid"
        aria-rowcount={filas.length}
        aria-colcount={cols}
      >
        {filas.map((fila, filaIndex) => (
          <div key={`fila-${filaIndex}`} role="row" className={styles.row}>
            {fila.map((franja, colIndex) => {
              const index = filaIndex * cols + colIndex;
              const libre = franja.estado === "libre";
              return (
                <div
                  key={franja.inicio}
                  role="gridcell"
                  aria-rowindex={filaIndex + 1}
                  aria-colindex={colIndex + 1}
                  className={styles.cellWrap}
                >
                  <button
                    ref={(el) => {
                      cellsRef.current[index] = el;
                    }}
                    type="button"
                    className={`${styles.cell} ${libre ? styles.libre : styles.ocupada}`}
                    onKeyDown={moverFoco(index)}
                    onClick={() => {
                      if (libre) onSeleccionar?.(franja);
                    }}
                    aria-disabled={!libre}
                  >
                    <span className={styles.hora}>{franja.etiqueta}</span>
                    <span className={styles.estado}>{libre ? "Disponible" : "Ocupada"}</span>
                    <span className={styles.local}>
                      <HoraLocal iso={franja.inicio} etiqueta="Tu hora" formato="hora" />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
