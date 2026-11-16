const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string, opciones: Intl.DateTimeFormatOptions) {
  const clave = `${zona}|${JSON.stringify(opciones)}`;
  const existente = formateadores.get(clave);
  if (existente) return existente;
  const nuevo = new Intl.DateTimeFormat("en-CA", { timeZone: zona, ...opciones });
  formateadores.set(clave, nuevo);
  return nuevo;
}

export function esFechaISO(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function partesEnZona(date: Date, zona: string) {
  const partes = formateador(zona, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const mapa: Record<string, string> = {};
  for (const parte of partes) {
    if (parte.type !== "literal") mapa[parte.type] = parte.value;
  }

  return {
    year: Number(mapa.year),
    month: Number(mapa.month),
    day: Number(mapa.day),
    hour: Number(mapa.hour),
    minute: Number(mapa.minute),
    second: Number(mapa.second),
  };
}

export function offsetZonaMs(date: Date, zona: string): number {
  const p = partesEnZona(date, zona);
  const comoUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return comoUtc - date.getTime();
}

/**
 * Convierte una fecha y hora local de la zona indicada a un instante UTC.
 * Itera porque el offset puede cambiar con el horario de verano.
 */
export function aUtc(fecha: string, hora: string, zona: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const base = Date.UTC(y, m - 1, d, h, min, 0, 0);
  let utc = base;
  for (let i = 0; i < 3; i += 1) {
    const offset = offsetZonaMs(new Date(utc), zona);
    utc = base - offset;
  }
  return new Date(utc);
}

export function fechaEnZona(date: Date, zona: string): string {
  const p = partesEnZona(date, zona);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatearHora(iso: string, zona: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatearFechaHora(iso: string, zona: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: zona,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatearFechaHoraLocal(iso: string, zona?: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    ...(zona ? { timeZone: zona } : {}),
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function idFranja(inicioIso: string): string {
  return new Date(inicioIso).toISOString().slice(0, 16).replace(":", "-");
}

export function inicioDesdeFranja(franja: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})$/.exec(franja);
  if (!match) return null;
  const [, fecha, hh, mm] = match;
  if (!esFechaISO(fecha)) return null;
  const h = Number(hh);
  const m = Number(mm);
  if (h > 23 || m > 59) return null;
  return `${fecha}T${hh}:${mm}:00.000Z`;
}

export function sumarMinutos(iso: string, minutos: number): string {
  return new Date(new Date(iso).getTime() + minutos * 60_000).toISOString();
}

export function horasHasta(iso: string, ahora = new Date()): number {
  return (new Date(iso).getTime() - ahora.getTime()) / 3_600_000;
}
