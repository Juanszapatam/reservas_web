"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert">
      <h1>Ocurrió un error</h1>
      <p>No fue posible cargar esta sección.</p>
      <pre>{error.message}</pre>
      <button type="button" onClick={() => reset()}>
        Reintentar
      </button>
    </section>
  );
}
