"use client";

import { useState } from "react";
import { horarioSchema, type Horario } from "@/schemas/horario";
import styles from "./ConfigHorarioForm.module.css";

const DIAS = [
  { valor: 0, nombre: "Domingo" },
  { valor: 1, nombre: "Lunes" },
  { valor: 2, nombre: "Martes" },
  { valor: 3, nombre: "Miércoles" },
  { valor: 4, nombre: "Jueves" },
  { valor: 5, nombre: "Viernes" },
  { valor: 6, nombre: "Sábado" },
];

export function ConfigHorarioForm({
  inicial,
  onGuardado,
}: {
  inicial: Horario;
  onGuardado: () => void;
}) {
  const [apertura, setApertura] = useState(inicial.apertura);
  const [cierre, setCierre] = useState(inicial.cierre);
  const [zonaHoraria, setZonaHoraria] = useState(inicial.zonaHoraria);
  const [dias, setDias] = useState<number[]>(inicial.diasLaborales);
  const [bloqueos, setBloqueos] = useState(inicial.bloqueos.join("\n"));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function alternarDia(valor: number) {
    setDias((prev) => (prev.includes(valor) ? prev.filter((d) => d !== valor) : [...prev, valor].sort()));
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setMensaje(null);

    const entrada = {
      apertura,
      cierre,
      zonaHoraria: zonaHoraria.trim(),
      diasLaborales: dias,
      bloqueos: Array.from(
        new Set(
          bloqueos
            .split(/\s+/)
            .map((b) => b.trim())
            .filter(Boolean)
        )
      ),
    };

    const validado = horarioSchema.safeParse(entrada);
    if (!validado.success) {
      const mapa: Record<string, string> = {};
      for (const issue of validado.error.issues) {
        const campo = issue.path.join(".") || "formulario";
        if (!mapa[campo]) mapa[campo] = issue.message;
      }
      setErrores(mapa);
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/config/horario", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validado.data),
      });
      if (res.status === 401) {
        setMensaje("Tu sesión venció. Vuelve a iniciar sesión.");
        return;
      }
      if (res.status === 403) {
        setMensaje("Solo el administrador puede cambiar el horario.");
        return;
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMensaje(json.error ?? "No se pudo guardar el horario.");
        return;
      }
      setMensaje("Horario guardado correctamente.");
      onGuardado();
    } catch {
      setMensaje("No se pudo guardar el horario.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={guardar} noValidate>
      <h2>Horario del negocio</h2>

      <div className={styles.fila}>
        <div className={styles.campo}>
          <label htmlFor="apertura">Apertura</label>
          <input
            id="apertura"
            name="apertura"
            type="time"
            value={apertura}
            onChange={(e) => setApertura(e.target.value)}
            aria-describedby={errores.apertura ? "apertura-error" : undefined}
            aria-invalid={Boolean(errores.apertura)}
          />
          {errores.apertura ? (
            <p id="apertura-error" className={styles.error} role="alert">
              {errores.apertura}
            </p>
          ) : null}
        </div>

        <div className={styles.campo}>
          <label htmlFor="cierre">Cierre</label>
          <input
            id="cierre"
            name="cierre"
            type="time"
            value={cierre}
            onChange={(e) => setCierre(e.target.value)}
            aria-describedby={errores.cierre ? "cierre-error" : undefined}
            aria-invalid={Boolean(errores.cierre)}
          />
          {errores.cierre ? (
            <p id="cierre-error" className={styles.error} role="alert">
              {errores.cierre}
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="zonaHoraria">Zona horaria del negocio</label>
        <input
          id="zonaHoraria"
          name="zonaHoraria"
          type="text"
          value={zonaHoraria}
          onChange={(e) => setZonaHoraria(e.target.value)}
          aria-describedby="zonaHoraria-ayuda"
        />
        <p id="zonaHoraria-ayuda" className={styles.ayuda}>
          Ejemplo: America/Bogota. Es la única fuente de verdad para las franjas.
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Días laborales</legend>
        <div className={styles.dias}>
          {DIAS.map((dia) => (
            <label key={dia.valor} className={styles.dia}>
              <input
                type="checkbox"
                name="diasLaborales"
                value={dia.valor}
                checked={dias.includes(dia.valor)}
                onChange={() => alternarDia(dia.valor)}
              />
              {dia.nombre}
            </label>
          ))}
        </div>
        {errores.diasLaborales ? (
          <p className={styles.error} role="alert">
            {errores.diasLaborales}
          </p>
        ) : null}
      </fieldset>

      <div className={styles.campo}>
        <label htmlFor="bloqueos">Días no laborales (bloqueos)</label>
        <textarea
          id="bloqueos"
          name="bloqueos"
          rows={4}
          value={bloqueos}
          onChange={(e) => setBloqueos(e.target.value)}
          placeholder="2026-12-25&#10;2026-12-31"
          aria-describedby="bloqueos-ayuda"
        />
        <p id="bloqueos-ayuda" className={styles.ayuda}>
          Un día por línea, formato YYYY-MM-DD.
        </p>
        {errores.bloqueos ? (
          <p className={styles.error} role="alert">
            {errores.bloqueos}
          </p>
        ) : null}
      </div>

      <div className={styles.acciones}>
        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar horario"}
        </button>
      </div>

      <div aria-live="polite" className={styles.mensaje}>
        {mensaje ? <p role="status">{mensaje}</p> : null}
      </div>
    </form>
  );
}
