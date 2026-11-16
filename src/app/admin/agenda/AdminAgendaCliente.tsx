"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CitaCard } from "@/components/CitaCard";
import { ConfigHorarioForm } from "@/components/ConfigHorarioForm";
import { useSesion } from "@/components/SesionProvider";
import { usePolling } from "@/hooks/usePolling";
import { formatearFechaHora } from "@/lib/fechas";
import type { Cita } from "@/schemas/cita";
import type { Horario } from "@/schemas/horario";
import styles from "./agenda.module.css";

type AgendaRespuesta = {
  fecha: string;
  zonaHoraria: string;
  items: Cita[];
};

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminAgendaCliente() {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useSesion();
  const [fecha, setFecha] = useState(hoyISO());
  const [agenda, setAgenda] = useState<AgendaRespuesta | null>(null);
  const [horario, setHorario] = useState<Horario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aCancelar, setACancelar] = useState<Cita | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const dialogoRef = useRef<HTMLDialogElement | null>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);

  const cargarAgenda = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/agenda?fecha=${encodeURIComponent(fecha)}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          router.push("/login?desde=/admin/agenda");
          return;
        }
        if (res.status === 403) {
          setError("Solo el administrador puede ver la agenda.");
          return;
        }
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? "No se pudo cargar la agenda.");
        }
        const json = (await res.json()) as AgendaRespuesta;
        setAgenda(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [fecha, router]
  );

  const cargarHorario = useCallback(async () => {
    try {
      const res = await fetch("/api/config/horario", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { horario: Horario };
      setHorario(json.horario);
    } catch {
      // El formulario mostrará su propio error al guardar.
    }
  }, []);

  useEffect(() => {
    if (cargandoSesion) return;
    if (!usuario || usuario.rol !== "admin") return;

    let cancelado = false;

    fetch(`/api/admin/agenda?fecha=${encodeURIComponent(fecha)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login?desde=/admin/agenda");
          return null;
        }
        if (res.status === 403) {
          throw new Error("Solo el administrador puede ver la agenda.");
        }
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? "No se pudo cargar la agenda.");
        }
        return (await res.json()) as AgendaRespuesta;
      })
      .then((json) => {
        if (!cancelado && json) setAgenda(json);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : "Error inesperado");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario, cargandoSesion, fecha, intento, router]);

  useEffect(() => {
    if (usuario?.rol !== "admin") return;
    let cancelado = false;

    fetch("/api/config/horario", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ horario: Horario }>) : null))
      .then((json) => {
        if (!cancelado && json) setHorario(json.horario);
      })
      .catch(() => {
        // El formulario mostrará su propio error al guardar.
      });

    return () => {
      cancelado = true;
    };
  }, [usuario]);

  usePolling(
    async () => {
      if (document.visibilityState === "visible") await cargarAgenda(true);
    },
    30_000,
    usuario?.rol === "admin"
  );

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;
    if (aCancelar && !dialogo.open) dialogo.showModal();
    else if (!aCancelar && dialogo.open) dialogo.close();
  }, [aCancelar]);

  function pedirCancelar(cita: Cita) {
    disparadorRef.current = document.activeElement as HTMLElement | null;
    setMensaje(null);
    setACancelar(cita);
  }

  async function confirmarCancelacion() {
    if (!aCancelar) return;
    const franja = aCancelar.franja;
    setCancelando(franja);
    setMensaje(null);
    try {
      const res = await fetch(`/api/citas/${encodeURIComponent(franja)}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/login?desde=/admin/agenda");
        return;
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMensaje(json.error ?? "No se pudo cancelar la cita.");
        return;
      }
      setMensaje("Cita cancelada correctamente.");
      setACancelar(null);
      await cargarAgenda(true);
    } catch {
      setMensaje("No se pudo cancelar la cita.");
    } finally {
      setCancelando(null);
    }
  }

  if (cargandoSesion) return <p role="status">Comprobando sesión…</p>;

  if (!usuario) {
    return (
      <p>
        Necesitas iniciar sesión como administrador.{" "}
        <Link href="/login?desde=/admin/agenda">Iniciar sesión</Link>
      </p>
    );
  }

  if (usuario.rol !== "admin") {
    return <p>Esta sección es solo para el administrador del negocio.</p>;
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.columnaAgenda}>
        <div className={styles.cabecera}>
          <div className={styles.campo}>
            <label htmlFor="fecha-agenda">Día de la agenda</label>
            <input
              id="fecha-agenda"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setCargando(true);
                setError(null);
                setMensaje(null);
              }}
            />
          </div>
          <p className={styles.resumen} aria-live="polite">
            {agenda ? `${agenda.items.length} cita(s) para el ${agenda.fecha}` : "Cargando agenda…"}
          </p>
        </div>

        <div aria-live="polite" className={styles.mensajes}>
          {mensaje ? <p className={styles.exito}>{mensaje}</p> : null}
        </div>

        <h2 className={styles.tituloLista}>Citas del día</h2>

        {cargando ? (
          <div className={styles.esqueleto} role="status" aria-label="Cargando agenda">
            <div /><div /><div />
          </div>
        ) : error ? (
          <div className={styles.errorBox} role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setCargando(true);
                setError(null);
                setIntento((n) => n + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        ) : agenda && agenda.items.length === 0 ? (
          <p>No hay citas para este día.</p>
        ) : agenda ? (
          <ul className={styles.lista}>
            {agenda.items.map((cita) => (
              <li key={cita.franja}>
                <CitaCard
                  cita={cita}
                  zonaHoraria={agenda.zonaHoraria}
                  onCancelar={pedirCancelar}
                  cancelando={cancelando === cita.franja}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className={styles.columnaConfig}>
        {horario ? (
          <ConfigHorarioForm
            inicial={horario}
            onGuardado={() => {
              setMensaje("Horario actualizado. Las franjas se recalculan al instante.");
              void cargarHorario();
              setIntento((n) => n + 1);
            }}
          />
        ) : (
          <p role="status">Cargando horario…</p>
        )}
      </div>

      <dialog
        ref={dialogoRef}
        className={styles.dialogo}
        aria-labelledby="admin-cancelar-titulo"
        onClose={() => {
          setACancelar(null);
          disparadorRef.current?.focus();
        }}
      >
        {aCancelar ? (
          <div className={styles.dialogoContenido}>
            <h2 id="admin-cancelar-titulo">Cancelar cita</h2>
            <p>
              ¿Cancelar la cita del{" "}
              <strong>
                {formatearFechaHora(aCancelar.inicio, agenda?.zonaHoraria ?? "America/Bogota")}
              </strong>{" "}
              de {aCancelar.correo}?
            </p>
            <div className={styles.dialogoAcciones}>
              <button type="button" onClick={confirmarCancelacion} disabled={cancelando !== null}>
                {cancelando ? "Cancelando…" : "Sí, cancelar"}
              </button>
              <button type="button" onClick={() => setACancelar(null)}>
                Volver
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
