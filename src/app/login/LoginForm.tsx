"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSesion } from "@/components/SesionProvider";
import { firebaseConfigurado } from "@/lib/firebase/client";
import styles from "./login.module.css";

type Modo = "entrar" | "registrar";

export function LoginForm({ desde }: { desde: string }) {
  const router = useRouter();
  const { usuario, refrescar } = useSesion();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [modo, setModo] = useState<Modo>("entrar");
  const firebaseListo = firebaseConfigurado();

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
  }

  async function autenticar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const [{ authCliente }, authModule] = await Promise.all([
        import("@/lib/firebase/client"),
        import("firebase/auth"),
      ]);

      const credencial =
        modo === "registrar"
          ? await authModule.createUserWithEmailAndPassword(authCliente(), correo, password)
          : await authModule.signInWithEmailAndPassword(authCliente(), correo, password);

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
      setError(traducirError(err));
    } finally {
      setEnviando(false);
    }
  }

  function traducirError(err: unknown): string {
    if (!(err instanceof Error)) return "No se pudo completar la operación";
    const mensaje = err.message;
    if (mensaje.includes("auth/email-already-in-use")) {
      return "Ese correo ya está registrado. Inicia sesión.";
    }
    if (mensaje.includes("auth/weak-password")) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    if (mensaje.includes("auth/invalid-email")) {
      return "El correo no es válido.";
    }
    if (mensaje.includes("auth/invalid-credential") || mensaje.includes("auth/wrong-password")) {
      return "Correo o contraseña incorrectos.";
    }
    if (mensaje.includes("auth/user-not-found")) {
      return "No existe una cuenta con ese correo.";
    }
    return mensaje;
  }

  if (usuario) {
    return (
      <p>
        Ya tienes una sesión iniciada como <strong>{usuario.correo}</strong>.{" "}
        <Link href={desde}>Continuar</Link>
      </p>
    );
  }

  if (!firebaseListo) {
    return (
      <div className={styles.demo}>
        <p>
          Firebase Auth no está configurado. Revisa las variables
          NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          NEXT_PUBLIC_FIREBASE_PROJECT_ID y NEXT_PUBLIC_FIREBASE_APP_ID en .env.local.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.contenedor}>
      <form className={styles.form} onSubmit={autenticar} noValidate>
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
            autoComplete={modo === "registrar" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        <button type="submit" disabled={enviando}>
          {enviando
            ? modo === "registrar"
              ? "Creando cuenta…"
              : "Entrando…"
            : modo === "registrar"
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>

      <p className={styles.alternativa}>
        {modo === "entrar" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
        <span
          className={styles.enlace}
          role="button"
          tabIndex={0}
          onClick={() => cambiarModo(modo === "entrar" ? "registrar" : "entrar")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              cambiarModo(modo === "entrar" ? "registrar" : "entrar");
            }
          }}
        >
          {modo === "entrar" ? "Regístrate" : "Inicia sesión"}
        </span>
      </p>

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