"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/components/SesionProvider";

export function SesionNav() {
  const { usuario, cargando, salir } = useSesion();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const botonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    function alPulsarFuera(evento: PointerEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", alPulsarFuera);
    document.addEventListener("keydown", alPulsarTecla);
    return () => {
      document.removeEventListener("pointerdown", alPulsarFuera);
      document.removeEventListener("keydown", alPulsarTecla);
    };
  }, [abierto]);

  async function cerrarSesion() {
    setAbierto(false);
    await salir();
    router.push("/");
    router.refresh();
  }

  if (cargando) {
    return <span className="sesion-cargando">Cargando sesión…</span>;
  }

  if (!usuario) {
    return (
      <Link className="sesion-enlace" href="/login">
        Iniciar sesión
      </Link>
    );
  }

  return (
    <div className="sesion-usuario" ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        className="sesion-boton"
        aria-expanded={abierto}
        aria-controls="menu-sesion"
        onClick={() => setAbierto((valor) => !valor)}
      >
        <span className="sesion-correo">{usuario.correo}</span>{" "}
        <span className="sesion-rol">({usuario.rol})</span>
        <span className="sesion-flecha" aria-hidden="true">
          ▾
        </span>
      </button>
      <div id="menu-sesion" className="sesion-menu" hidden={!abierto}>
        <button type="button" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
