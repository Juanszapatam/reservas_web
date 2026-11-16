import type { Metadata } from "next";
import Link from "next/link";
import { SesionProvider } from "@/components/SesionProvider";
import { SesionNav } from "@/components/SesionNav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Reserva de citas",
    template: "%s | Reserva de citas",
  },
  description: "Sistema de reserva de citas por franjas de 30 minutos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <SesionProvider>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <header className="site-header">
            <div className="container header-inner">
              <p className="brand">Reserva de citas</p>
              <nav aria-label="Principal">
                <ul className="nav-list">
                  <li><Link href="/">Inicio</Link></li>
                  <li><Link href="/reservar">Reservar</Link></li>
                  <li><Link href="/mis-citas">Mis citas</Link></li>
                  <li><Link href="/admin/agenda">Agenda (admin)</Link></li>
                </ul>
              </nav>
              <SesionNav />
            </div>
          </header>
          <main id="contenido" tabIndex={-1} className="container main">
            {children}
          </main>
          <footer className="site-footer">
            <div className="container">
              <small>Proyecto de reserva de citas por franjas (entorno de desarrollo).</small>
            </div>
          </footer>
        </SesionProvider>
      </body>
    </html>
  );
}
