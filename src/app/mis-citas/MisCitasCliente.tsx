"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CitaCard } from "@/components/CitaCard";
import { useSesion } from "@/components/SesionProvider";
import { formatearFechaHora } from "@/lib/fechas";
import type { Cita } from "@/schemas/cita";
import styles from "./mis-citas.module.css";

type Respuesta = {
  items: Cita[];
  activas: Cita[];
  historial: Cita[];
  zonaHoraria: string;
};

export function MisCitasCliente() {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useSesion();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [aCancelar, setACancelar] = useState<Cita | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const dialogoRef = useRef<HTMLDialogElement | null>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (cargandoSesion) return;
    if (!usuario) return;

    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch("/api/mis-citas", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login?desde=/mis-citas");
          return;
        }
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? "No se pudieron cargar tus citas.");
        }
        const json = (await res.json()) as Respuesta;
        if (!cancelado) setDatos(json);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [usuario, cargandoSesion, intento, router]);

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
        router.push("/login?desde=/mis-citas");
        return;
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMensaje(json.error ?? "No se pudo cancelar la cita.");
        return;
      }
      setDatos((prev) =>
        prev
          ? {
              ...prev,
              activas: prev.activas.filter((c) => c.franja !== franja),
              historial: prev.historial.concat({ ...aCancelar, estado: "cancelada" }),
              items: prev.items.map((c) => (c.franja === franja ? { ...c, estado: "cancelada" } : c)),
            }
          : prev
      );
      setMensaje("Cita cancelada correctamente.");
      setACancelar(null);
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
        Necesitas iniciar sesión para ver tus citas.{" "}
        <Link href="/login?desde=/mis-citas">Iniciar sesión</Link>
      </p>
    );
  }

  return (
    <div className={styles.contenedor}>
      <div aria-live="polite" className={styles.mensajes}>
        {mensaje ? <p className={styles.exito}>{mensaje}</p> : null}
      </div>

      {cargando ? (
        <div className={styles.esqueleto} role="status" aria-label="Cargando citas">
          <div /><div /><div />
        </div>
      ) : error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : datos && datos.activas.length === 0 && datos.historial.length === 0 ? (
        <p>
          Aún no tienes citas. <Link href="/reservar">Reserva una franja</Link>.
        </p>
      ) : datos ? (
        <>
          <section aria-labelledby="activas-titulo">
            <h2 id="activas-titulo">Citas activas</h2>
            {datos.activas.length === 0 ? (
              <p>No tienes citas activas.</p>
            ) : (
              <ul className={styles.lista}>
                {datos.activas.map((cita) => (
                  <li key={cita.franja}>
                    <CitaCard
                      cita={cita}
                      zonaHoraria={datos.zonaHoraria}
                      onCancelar={pedirCancelar}
                      cancelando={cancelando === cita.franja}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="historial-titulo">
            <h2 id="historial-titulo">Historial</h2>
            {datos.historial.length === 0 ? (
              <p>Tu historial está vacío.</p>
            ) : (
              <ul className={styles.lista}>
                {datos.historial.map((cita) => (
                  <li key={`${cita.franja}-${cita.estado}`}>
                    <CitaCard cita={cita} zonaHoraria={datos.zonaHoraria} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <dialog
        ref={dialogoRef}
        className={styles.dialogo}
        aria-labelledby="cancelar-titulo"
        onClose={() => {
          setACancelar(null);
          disparadorRef.current?.focus();
        }}
      >
        {aCancelar ? (
          <div className={styles.dialogoContenido}>
            <h2 id="cancelar-titulo">Cancelar cita</h2>
            <p>
              ¿Seguro que quieres cancelar la cita del{" "}
              <strong>{formatearFechaHora(aCancelar.inicio, datos?.zonaHoraria ?? "America/Bogota")}</strong> (hora del
              negocio)?
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
