"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { HoraLocal } from "@/components/HoraLocal";
import { useSesion } from "@/components/SesionProvider";
import { SlotGrid } from "@/components/SlotGrid";
import { useHidratado } from "@/hooks/useHidratado";
import { idFranja } from "@/lib/fechas";
import { descargarICS } from "@/lib/ics";
import type { Cita } from "@/schemas/cita";
import { SEDES_POR_DEFECTO, type Servicio } from "@/lib/sedes";
import { fechaQuerySchema, type Franja, type FranjasResponse } from "@/schemas/franja";
import styles from "./reservar.module.css";

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mensajeVacio(motivo: FranjasResponse["motivo"]): string {
  switch (motivo) {
    case "dia-no-laboral":
      return "El negocio no atiende ese día.";
    case "bloqueado":
      return "Ese día está bloqueado y no tiene atención.";
    case "pasado":
      return "No quedan franjas futuras para ese día.";
    default:
      return "No hay franjas disponibles para este día.";
  }
}

export function ReservarCliente({ fechaInicial }: { fechaInicial: string }) {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useSesion();
  const [fecha, setFecha] = useState(fechaInicial);
  const [datos, setDatos] = useState<FranjasResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [seleccionada, setSeleccionada] = useState<Franja | null>(null);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>(SEDES_POR_DEFECTO[0].servicios);
  const [servicio, setServicio] = useState<string>(SEDES_POR_DEFECTO[0].servicios[0].id);
  const [exito, setExito] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [ultimaCita, setUltimaCita] = useState<Cita | null>(null);
  const [pendiente, startTransition] = useTransition();
  const dialogoRef = useRef<HTMLDialogElement | null>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);

  const fechaValida = useMemo(() => fechaQuerySchema.safeParse({ fecha }), [fecha]);
  const base = datos?.franjas ?? [];

  const [franjasOptimistas, agregarOptimista] = useOptimistic(
    base,
    (estado: Franja[], franjaId: string) =>
      estado.map((f) => (idFranja(f.inicio) === franjaId ? { ...f, estado: "ocupada" as const } : f))
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (fechaValida.success) params.set("fecha", fechaValida.data.fecha);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [fechaValida]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!fechaValida.success) {
        setDatos(null);
        setCargando(false);
        setError(null);
        setErrorFecha(fechaValida.error.issues[0]?.message ?? "Fecha inválida");
        return;
      }

      setErrorFecha(null);
      setCargando(true);
      setError(null);

      try {
        const res = await fetch(`/api/franjas?fecha=${encodeURIComponent(fechaValida.data.fecha)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "No se pudieron cargar las franjas.");
        }
        const json = (await res.json()) as FranjasResponse;
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
  }, [fechaValida, intento]);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;
    if (seleccionada && !dialogo.open) {
      dialogo.showModal();
    } else if (!seleccionada && dialogo.open) {
      dialogo.close();
    }
  }, [seleccionada]);

  useEffect(() => {
    let cancelado = false;

    void (async () => {
      await Promise.resolve();
      if (cancelado) return;

      if (!usuario?.sede) {
        const servicios = SEDES_POR_DEFECTO[0].servicios;
        setServiciosDisponibles(servicios);
        setServicio(servicios[0]?.id ?? "");
        return;
      }

      try {
        const res = await fetch("/api/sedes", { cache: "no-store" });
        if (!res.ok || cancelado) return;
        const json = (await res.json()) as { sedes?: { id: string; servicios: Servicio[] }[] };
        const sede = json.sedes?.find((item) => item.id === usuario.sede);
        if (sede?.servicios?.length) {
          setServiciosDisponibles(sede.servicios);
          setServicio(sede.servicios[0].id);
        }
      } catch {
        // Mantiene los servicios por defecto si falla la carga.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [usuario?.sede]);

  function abrirDialogo(franja: Franja) {
    disparadorRef.current = document.activeElement as HTMLElement | null;
    setConflicto(null);
    setServicio(serviciosDisponibles[0]?.id ?? "");
    setSeleccionada(franja);
  }

  function cerrarDialogo() {
    setSeleccionada(null);
  }

  function confirmarReserva(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!seleccionada || !usuario) return;

    const franjaId = idFranja(seleccionada.inicio);
    const franjaSeleccionada = seleccionada;

    startTransition(async () => {
      agregarOptimista(franjaId);

      try {
        const res = await fetch("/api/citas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ franja: franjaId, servicio }),
        });

        if (res.status === 401) {
          router.push(`/login?desde=${encodeURIComponent(`/reservar?fecha=${fecha}`)}`);
          return;
        }

        const json = (await res.json().catch(() => ({}))) as { error?: string; cita?: Cita };

        if (!res.ok) {
          if (res.status === 409) {
            setConflicto(json.error ?? "Esa franja acaba de ser ocupada. Actualizamos la disponibilidad.");
            setIntento((n) => n + 1);
          } else {
            setError(json.error ?? "No se pudo crear la cita.");
          }
          return;
        }

        if (!json.cita) {
          setError("La respuesta del servidor no incluyó la cita.");
          return;
        }

        setUltimaCita(json.cita);
        setExito(`Cita confirmada para el ${franjaSeleccionada.etiqueta} (hora del negocio).`);
        setDatos((prev) =>
          prev
            ? {
                ...prev,
                franjas: prev.franjas.map((f) =>
                  f.inicio === franjaSeleccionada.inicio ? { ...f, estado: "ocupada" as const } : f
                ),
              }
            : prev
        );
        setSeleccionada(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear la cita.");
      }
    });
  }

  const zonaNegocio = datos?.zonaHoraria ?? "…";

  return (
    <div className={styles.contenedor}>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.campo}>
          <label htmlFor="fecha">Selecciona un día</label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            value={fecha}
            min={hoyISO()}
            onChange={(e) => {
              setFecha(e.target.value);
              setExito(null);
              setConflicto(null);
              setUltimaCita(null);
            }}
            aria-describedby={errorFecha ? "fecha-error" : undefined}
            aria-invalid={errorFecha ? true : undefined}
          />
          {errorFecha ? (
            <p id="fecha-error" className={styles.errorCampo} role="alert">
              {errorFecha}
            </p>
          ) : null}
        </div>
        <p className={styles.zonas}>
          Zona horaria del negocio: <strong>{zonaNegocio}</strong>
          <br />
          <ZonaUsuario />
        </p>
      </form>

      <div aria-live="polite" className={styles.estadoRegion}>
        {cargando ? <p>Cargando franjas…</p> : null}

        {!cargando && error ? (
          <div className={styles.errorBox} role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        ) : null}

        {exito && ultimaCita ? (
          <div className={styles.exito} role="status">
            <p>{exito}</p>
            <p>
              <HoraLocal iso={ultimaCita.inicio} etiqueta="Tu hora local" />
            </p>
            <div className={styles.exitoAcciones}>
              <button
                type="button"
                onClick={() => descargarICS(ultimaCita, datos?.zonaHoraria ?? "America/Bogota")}
              >
                Agregar a mi calendario (.ics)
              </button>
              <Link href="/mis-citas">Ver mis citas</Link>
            </div>
          </div>
        ) : null}

        {!cargando && !error && datos && datos.franjas.length === 0 ? (
          <p>{mensajeVacio(datos.motivo)}</p>
        ) : null}
      </div>

      {!cargando && !error && datos && datos.franjas.length > 0 ? (
        <SlotGrid
          franjas={franjasOptimistas}
          zonaHoraria={datos.zonaHoraria}
          fecha={datos.fecha}
          onSeleccionar={abrirDialogo}
        />
      ) : null}

      <dialog
        ref={dialogoRef}
        className={styles.dialogo}
        aria-labelledby="dialogo-titulo"
        onClose={() => {
          setSeleccionada(null);
          disparadorRef.current?.focus();
        }}
      >
        {seleccionada ? (
          <form className={styles.dialogoForm} onSubmit={confirmarReserva}>
            <h2 id="dialogo-titulo">Confirmar reserva</h2>
            <p>
              <strong>{seleccionada.etiqueta}</strong> (hora del negocio)
            </p>
            <p>
              <HoraLocal iso={seleccionada.inicio} etiqueta="Tu hora local" />
            </p>

            <div className={styles.campo}>
              <label htmlFor="servicio">Servicio</label>
              <select
                id="servicio"
                name="servicio"
                value={servicio}
                onChange={(e) => setServicio(e.target.value)}
              >
                {serviciosDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            {!cargandoSesion && !usuario ? (
              <p className={styles.aviso}>
                <Link href={`/login?desde=${encodeURIComponent(`/reservar?fecha=${fecha}`)}`}>
                  Inicia sesión
                </Link>{" "}
                para confirmar tu reserva.
              </p>
            ) : null}

            {conflicto ? (
              <p className={styles.errorCampo} role="alert">
                {conflicto}
              </p>
            ) : null}

            <div className={styles.dialogoAcciones}>
              <button type="submit" disabled={!usuario || pendiente}>
                {pendiente ? "Reservando…" : "Confirmar reserva"}
              </button>
              <button type="button" onClick={cerrarDialogo}>
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}

function ZonaUsuario() {
  const hidratado = useHidratado();
  const zona = hidratado ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  return <span>Tu zona horaria: {zona || "calculando…"}</span>;
}
