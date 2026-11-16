"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Rol } from "@/lib/auth";

export type UsuarioSesion = {
  uid: string;
  correo: string;
  rol: Rol;
};

type ContextoSesion = {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  refrescar: () => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

async function leerSesion(): Promise<UsuarioSesion | null> {
  const res = await fetch("/api/auth/yo", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("No se pudo leer la sesión");
  const json = (await res.json()) as { usuario: UsuarioSesion };
  return json.usuario;
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      setUsuario(await leerSesion());
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    leerSesion()
      .then((actual) => {
        if (!cancelado) setUsuario(actual);
      })
      .catch(() => {
        if (!cancelado) setUsuario(null);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const salir = useCallback(async () => {
    await fetch("/api/auth/demo", { method: "DELETE" });
    await fetch("/api/auth/sesion", { method: "DELETE" });
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, refrescar, salir }),
    [usuario, cargando, refrescar, salir]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return contexto;
}
