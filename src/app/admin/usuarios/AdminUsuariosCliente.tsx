"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "@/components/SesionProvider";

type UsuarioAdmin = {
  uid: string;
  correo: string;
  rol: "cliente" | "admin";
  sede?: string;
  deshabilitado: boolean;
};

type Sede = {
  id: string;
  nombre: string;
  tipoNegocio: "barberia" | "consultorio";
};

const OPCIONES_POR_PAGINA = [5, 10, 20];

export function AdminUsuariosCliente() {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useSesion();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resUsuarios, resSedes] = await Promise.all([
        fetch("/api/admin/usuarios", { cache: "no-store" }),
        fetch("/api/sedes", { cache: "no-store" }),
      ]);
      if (resUsuarios.status === 401) {
        router.push("/login?desde=/admin/usuarios");
        return;
      }
      if (resUsuarios.status === 403) {
        setError("Solo el administrador puede gestionar usuarios.");
        return;
      }
      if (!resUsuarios.ok) {
        const json = (await resUsuarios.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "No se pudieron cargar los usuarios.");
      }
      const json = (await resUsuarios.json()) as { usuarios: UsuarioAdmin[] };
      setUsuarios(json.usuarios);
      if (resSedes.ok) {
        const jsonSedes = (await resSedes.json()) as { sedes: Sede[] };
        setSedes(jsonSedes.sedes);
      }
      setPagina(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    if (cargandoSesion) return;
    if (!usuario || usuario.rol !== "admin") return;
    void (async () => {
      await Promise.resolve();
      await cargar();
    })();
  }, [usuario, cargandoSesion, cargar]);

  async function cambiarRol(uid: string, rol: "cliente" | "admin") {
    setCambiando(uid);
    setMensaje(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, rol }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo cambiar el rol.");
      }
      setUsuarios((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, rol } : u))
      );
      setMensaje(
        "Rol actualizado. El usuario debe volver a iniciar sesión para que el cambio tenga efecto."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCambiando(null);
    }
  }

  async function cambiarSede(uid: string, sede: string, rolActual: "cliente" | "admin") {
    setCambiando(uid);
    setMensaje(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, rol: rolActual, sede }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo cambiar la sede.");
      }
      setUsuarios((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, sede } : u))
      );
      setMensaje("Sede asignada. El usuario debe volver a iniciar sesión para ver el nuevo contenido.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCambiando(null);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter(
      (u) =>
        u.correo.toLowerCase().includes(texto) ||
        u.uid.toLowerCase().includes(texto) ||
        u.rol.toLowerCase().includes(texto)
    );
  }, [usuarios, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const usuariosPagina = useMemo(
    () => usuariosFiltrados.slice(inicio, inicio + porPagina),
    [usuariosFiltrados, inicio, porPagina]
  );

  function cambiarFiltro(valor: string) {
    setFiltro(valor);
    setPagina(1);
  }

  function cambiarPorPagina(valor: number) {
    setPorPagina(valor);
    setPagina(1);
  }

  if (cargandoSesion) return <p role="status">Comprobando sesión…</p>;

  if (!usuario) {
    return (
      <p>
        Necesitas iniciar sesión como administrador.{" "}
        <Link href="/login?desde=/admin/usuarios">Iniciar sesión</Link>
      </p>
    );
  }

  if (usuario.rol !== "admin") {
    return <p>Esta sección es solo para el administrador del negocio.</p>;
  }

  const botonBase: React.CSSProperties = {
    minHeight: "36px",
    padding: "0.4rem 0.75rem",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    background: "var(--bg)",
    color: "var(--fg)",
    cursor: "pointer",
    font: "inherit",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h2>Usuarios y roles</h2>
      {mensaje ? <p style={{ color: "var(--success, green)" }}>{mensaje}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Buscar por correo, UID o rol…"
          value={filtro}
          onChange={(e) => cambiarFiltro(e.target.value)}
          style={{
            minWidth: "260px",
            maxWidth: "100%",
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            font: "inherit",
            background: "var(--bg)",
            color: "var(--fg)",
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          Filas por página:
          <select
            value={porPagina}
            onChange={(e) => cambiarPorPagina(Number(e.target.value))}
            style={{
              padding: "0.4rem 0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              background: "var(--bg)",
              color: "var(--fg)",
              font: "inherit",
            }}
          >
            {OPCIONES_POR_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando ? (
        <p role="status" style={{ color: "var(--focus)" }}>
          Cargando usuarios…
        </p>
      ) : usuariosFiltrados.length === 0 ? (
        <p>No hay usuarios que coincidan con la búsqueda.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto", borderRadius: "0.75rem", border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg)", color: "var(--fg)" }}>
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem", width: "34%" }}>Correo</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", width: "30%" }}>UID</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", width: "12%" }}>Rol</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", width: "22%" }}>Sede</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", width: "20%" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosPagina.map((u) => {
                  const esMismoUsuario = u.uid === usuario.uid;
                  const nuevoRol = u.rol === "admin" ? "cliente" : "admin";
                  return (
                    <tr
                      key={u.uid}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "var(--hover)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "0.75rem", wordBreak: "break-word" }}>{u.correo || "—"}</td>
                      <td style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
                        {u.uid}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: u.rol === "admin" ? "var(--focus)" : "var(--border)",
                            color: u.rol === "admin" ? "#fff" : "inherit",
                          }}
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <select
                          value={u.sede ?? ""}
                          disabled={cambiando === u.uid || u.uid === usuario?.uid}
                          onChange={(e) => cambiarSede(u.uid, e.target.value, u.rol)}
                          style={{
                            padding: "0.4rem 0.5rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            background: "var(--bg)",
                            color: "var(--fg)",
                            font: "inherit",
                            minWidth: "150px",
                          }}
                        >
                          <option value="">Sin asignar</option>
                          {sedes.map((sede) => (
                            <option key={sede.id} value={sede.id}>
                              {sede.nombre} ({sede.tipoNegocio})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {esMismoUsuario ? (
                          <span style={{ fontSize: "0.85rem", color: "var(--muted, inherit)" }}>Tú</span>
                        ) : (
                          <button
                            type="button"
                            disabled={cambiando === u.uid}
                            onClick={() => cambiarRol(u.uid, nuevoRol)}
                            style={{
                              ...botonBase,
                              background: u.rol === "admin" ? "var(--bg)" : "var(--focus)",
                              color: u.rol === "admin" ? "inherit" : "#fff",
                              cursor: cambiando === u.uid ? "wait" : "pointer",
                              opacity: cambiando === u.uid ? 0.7 : 1,
                            }}
                          >
                            {cambiando === u.uid
                              ? "Guardando…"
                              : u.rol === "admin"
                                ? "Quitar admin"
                                : "Hacer admin"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Paginación de usuarios"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>
              {usuariosFiltrados.length} usuario(s) · página {paginaActual} de {totalPaginas}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                style={botonBase}
                disabled={paginaActual <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                style={botonBase}
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}

      <p style={{ fontSize: "0.85rem", color: "var(--muted, inherit)" }}>
        Nota: el cambio de rol se aplica en Firebase Auth. El usuario debe volver a
        iniciar sesión para que el nuevo rol tenga efecto en la aplicación.
      </p>
    </div>
  );
}