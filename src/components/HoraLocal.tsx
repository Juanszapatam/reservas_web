"use client";

import { useHidratado } from "@/hooks/useHidratado";

function formatear(iso: string, formato: "completo" | "hora"): string {
  const opciones: Intl.DateTimeFormatOptions =
    formato === "hora"
      ? { hour: "2-digit", minute: "2-digit" }
      : { dateStyle: "medium", timeStyle: "short" };
  return new Intl.DateTimeFormat("es-CO", opciones).format(new Date(iso));
}

export function HoraLocal({
  iso,
  etiqueta = "Tu hora local",
  formato = "completo",
}: {
  iso: string;
  etiqueta?: string;
  formato?: "completo" | "hora";
}) {
  const hidratado = useHidratado();
  const texto = hidratado ? formatear(iso, formato) : "";

  return (
    <span>
      {etiqueta}: <time dateTime={iso}>{texto || "calculando…"}</time>
    </span>
  );
}
