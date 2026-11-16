"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSesion } from "@/components/SesionProvider";
import styles from "./login.module.css";

export function LoginForm({ desde }: { desde: string }) {
  const router = useRouter();
  const { usuario, refrescar } = useSesion();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [firebaseListo, setFirebaseListo] = useState<boolean | null>(null);

  useEffect(() => {
    let activo = true;
    import("@/lib/firebase/client")
      .then((modulo) => {
        if (activo) setFirebaseListo(modulo.firebaseConfigurado());
      })
      .catch(() => {
        if (activo) setFirebaseListo(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  async function entrarConCorreo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const [{ authCliente }, { signInWithEmailAndPassword }] = await Promise.all([
        import("@/lib/firebase/client"),
        import("firebase/auth"),
      ]);
      const credencial = await signInWithEmailAndPassword(authCliente(), correo, password);
      const idToken = await credencial.user.getIdToken();
      const res = await fetch("/api/auth/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "No se pudo crear la sesión");
      }
      await refrescar();
      router.push(desde);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarDemo(rol: "cliente" | "admin") {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "No se pudo iniciar la sesión de demostración");
      }
      await refrescar();
      router.push(desde);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la sesión de demostración");
    } finally {
      setEnviando(false);
    }
  }

  if (usuario) {
    return (
      <p>
        Ya tienes una sesión iniciada como <strong>{usuario.correo}</strong>.{" "}
        <Link href={desde}>Continuar</Link>
      </p>
    );
  }

  return (
    <div className={styles.contenedor}>
      {firebaseListo ? (
        <form className={styles.form} onSubmit={entrarConCorreo} noValidate>
          <div className={styles.campo}>
            <label htmlFor="correo">Correo electrónico</label>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div className={styles.campo}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
      ) : firebaseListo === false ? (
        <div className={styles.demo}>
          <p>
            Firebase Auth no está configurado en este entorno. Para probar el flujo completo puedes usar una sesión de
            demostración local:
          </p>
          <div className={styles.botones}>
            <button type="button" onClick={() => entrarDemo("cliente")} disabled={enviando}>
              Entrar como cliente demo
            </button>
            <button type="button" onClick={() => entrarDemo("admin")} disabled={enviando}>
              Entrar como admin demo
            </button>
          </div>
        </div>
      ) : (
        <p role="status">Comprobando configuración…</p>
      )}

      <div aria-live="polite" className={styles.errorRegion}>
        {error ? (
          <p id="login-error" role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
