import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Inicia sesión para reservar y gestionar tus citas.",
};

type Props = {
  searchParams?: Promise<{ desde?: string }> | { desde?: string };
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await Promise.resolve(searchParams);
  const desdeBruto = typeof sp?.desde === "string" ? sp.desde : "/reservar";
  const desde = desdeBruto.startsWith("/") && !desdeBruto.startsWith("//") ? desdeBruto : "/reservar";

  return (
    <section>
      <h1>Iniciar sesión</h1>
      <p>Accede para reservar, cancelar y consultar tus citas.</p>
      <LoginForm desde={desde} />
    </section>
  );
}
