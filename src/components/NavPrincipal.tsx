"use client";

import Link from "next/link";
import { useSesion } from "@/components/SesionProvider";

export function NavPrincipal() {
  const { usuario } = useSesion();

  return (
    <nav aria-label="Principal">
      <ul className="nav-list">
        <li><Link href="/">Inicio</Link></li>
        <li><Link href="/reservar">Reservar</Link></li>
        <li><Link href="/mis-citas">Mis citas</Link></li>
        {usuario?.rol === "admin" ? (
          <>
            <li><Link href="/admin/agenda">Agenda (admin)</Link></li>
            <li><Link href="/admin/usuarios">Usuarios</Link></li>
          </>
        ) : null}
      </ul>
    </nav>
  );
}