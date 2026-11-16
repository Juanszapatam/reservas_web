import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La ruta solicitada no existe.</p>
      <Link href="/">Volver al inicio</Link>
    </section>
  );
}
