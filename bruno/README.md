# Colección Bruno · Reserva de citas

Solicitudes para probar la API con [Bruno](https://www.usebruno.com/).

## Uso

1. Abre Bruno → **Open Collection** → selecciona esta carpeta `bruno/`.
2. Selecciona el entorno **Local** (variables en `environments/Local.bru`).
3. Arranca la app con `npm run dev`.
4. Ejecuta las solicitudes en el orden sugerido.

## Orden sugerido

1. `05-autenticacion/Login demo cliente` (crea la cookie `sesion=demo-cliente`).
2. `01-franjas/Listar franjas`.
3. `02-citas/Crear cita` → `02-citas/Mis citas` → `02-citas/Cancelar cita`.
4. `05-autenticacion/Login demo admin`.
5. `03-admin/Agenda del día` y `04-configuracion/*`.

Las solicitudes autenticadas envían la cookie demo en la cabecera `cookie`.
Para usar Firebase real, inicia sesión en `/login`, copia la cookie `sesion`
desde el navegador y reemplaza `cookieCliente`/`cookieAdmin` en el entorno.

> Las fechas de ejemplo (`2030-01-02`, `2030-01-02T15-00`) son futuras a
> propósito para que las pruebas sigan siendo válidas con el paso del tiempo.
