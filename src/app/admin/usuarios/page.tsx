import type { Metadata } from "next";
import { AdminUsuariosCliente } from "./AdminUsuariosCliente";

export const metadata: Metadata = {
  title: "Usuarios",
  description: "Gestión de usuarios y roles.",
};

export default function AdminUsuariosPage() {
  return (
    <section>
      <h1>Usuarios</h1>
      <p>Administra los roles de los usuarios del negocio.</p>
      <AdminUsuariosCliente />
    </section>
  );
}