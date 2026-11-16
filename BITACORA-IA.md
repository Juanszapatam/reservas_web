# Bitácora de IA

Registro de las intervenciones del asistente. Formato: **propósito**, **evidencia**, **validación** y **decisión**.

## 2026-11-16 · Configuración inicial del proyecto y de la IA

- **Propósito:** crear el esqueleto Next.js, la estructura del enunciado y la configuración de IA de la sección 15 antes de escribir funcionalidad.
- **Evidencia:** `AGENTS.md` (reglas), `ia/README.md`, `ia/restricciones-verificar.mjs`, `.env.example`, `.gitignore` con `.env*` ignorado y este archivo.
- **Validación:** `node ia/restricciones-verificar.mjs` (sin secretos versionados ni imports prohibidos); `npm run lint`; `npm run build`.
- **Decisión:** mantener Firebase en modo *placeholder* (mocks) hasta el hito de integración; la configuración web pública se documenta en `.env.example` y las claves privadas nunca se versionan.

## 2026-11-16 · Hito 1: cuadrícula de franjas accesible

- **Propósito:** entregar la cuadrícula de franjas con datos de ejemplo, navegación por teclado, `?fecha=` compartible y estados de carga/vacío/error.
- **Evidencia:** `src/app/api/franjas/route.ts`, `src/app/reservar/*`, `src/components/SlotGrid.tsx`, `tests/franja.schema.test.ts`.
- **Validación:** `npm test` en verde; `npm run build` sin errores; revisión manual de foco y teclado (flechas, Home/End) en `/reservar`.
- **Decisión:** usar `role="grid"` con botones `gridcell` para conservar la semántica de acción y la navegación con flechas. La generación de franjas vive en la API mock y se validará con Zod en cliente y servidor.

## 2026-11-16 · Hitos 2–4: rutas, API por capas, autenticación y calidad

- **Propósito:** completar el flujo de reserva (cliente y administrador) con una API por capas, autenticación con roles, documentación y pruebas de los casos críticos.
- **Evidencia:**
  - Esquemas Zod en `src/schemas/` y reglas de negocio en `src/services/` (`franjas.ts`, `citas.ts`).
  - Repositorios en `src/repositories/` (memoria hoy, preparados para Firestore) y Route Handlers en `src/app/api/**`.
  - UI: `SlotGrid`, `CitaCard`, `ConfigHorarioForm`, `SesionProvider`, `HoraLocal`; páginas `/reservar`, `/mis-citas`, `/login`, `/admin/agenda`.
  - Seguridad: cookie `HttpOnly`, verificación de `Origin` (CSRF), límite de peticiones, cabeceras y CSP en `next.config.ts`.
  - Documentación: `openapi.yaml`, colección `bruno/`, `calidad/README.md` y evidencias en `calidad/evidencias/`.
  - Pruebas: `tests/franjas.service.test.ts`, `tests/citas.service.test.ts`, `tests/api.franjas.test.ts`, `tests/api.citas.test.ts`, `tests/CitaCard.test.tsx` y `tests/SlotGrid.test.tsx`.
- **Validación:** `npm run lint` sin advertencias; `npx tsc --noEmit` sin errores; `npm test` (7 archivos, 50 pruebas) en verde; `npm run build` correcto; `node ia/restricciones-verificar.mjs` en verde. Flujos comprobados en navegador: reserva, límite de citas, cancelación, regla de 2 horas, agenda y guardado de horario.
- **Decisión:** mantener repositorios en memoria para que el proyecto sea ejecutable sin credenciales, con la integración de Firebase aislada en `src/lib/firebase/` y activada por variables de entorno. El modo demo solo existe fuera de producción.

## 2026-11-16 · Corrección de `set-state-in-effect` y estabilidad del build

- **Propósito:** dejar ESLint limpio con las reglas de React 19 y evitar que `firebase-admin` se cargara durante el build.
- **Evidencia:** `src/hooks/useHidratado.ts` (`useSyncExternalStore`) para valores solo del navegador; efectos basados en `fetch` con bandera de cancelación en `SesionProvider`, `MisCitasCliente` y `AdminAgendaCliente`; imports dinámicos en `src/lib/firebase/admin.ts` y llamadas con `await authAdmin()` en `src/lib/auth.ts`.
- **Validación:** `npm run lint`, `npx tsc --noEmit`, `npm test` y `npm run build` en verde.
- **Decisión:** no usar `setState` síncrono dentro de efectos; los datos externos se leen en el efecto y se descartan al desmontar. `firebase-admin` se importa solo cuando la autenticación real está configurada.

## 2026-11-16 · Persistencia real en Firestore con transacciones y respaldo en memoria

- **Propósito:** sustituir los datos simulados por una capa Firestore real (Admin SDK) sin romper el modo demo ni las pruebas, y garantizar que dos reservas simultáneas de la misma franja no puedan confirmarse las dos.
- **Evidencia:**
  - `src/repositories/citas.firestore.ts` — `citas/{franja}` con la franja como ID; `crear` y `cancelar` dentro de `runTransaction`; cancelar mueve la cita a `historial/{autoId}` y libera la franja de forma atómica.
  - `src/repositories/horario.firestore.ts` — horario en `config/horario`.
  - `src/repositories/citas.memoria.ts` y `horario.memoria.ts` — implementación anterior, ahora como respaldo para demo y pruebas.
  - `src/repositories/seleccion.ts` y las fachadas `citas.ts` / `horario.ts` — eligen Firestore o memoria sin cambiar la API pública que consumen servicios y rutas.
  - `src/lib/firebase/admin.ts` — inicialización compatible con emuladores (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, proyecto `demo-reserva`) y helpers `firestoreConfigurado()` / `authConfigurada()`.
  - `firestore.rules` (todo el acceso de cliente denegado), `firestore.indexes.json` (índices de `fecha + inicio`, `uid + inicio` e historial), `firebase.json` y `.firebaserc`.
  - `tests/repositorio.test.ts` — 6 pruebas de la selección de repositorio.
  - `README.md` — modelo de datos, tabla de selección, puesta en marcha de Firebase real y emuladores.
- **Validación:** `npm run lint` sin advertencias; `npx tsc --noEmit` sin errores; `npm test` (8 archivos, 56 pruebas) en verde; `npm run build` correcto; `node ia/restricciones-verificar.mjs` en verde. La conexión real con Firestore y Auth no se pudo ejecutar en este equipo (Node 20.11.1): `firebase-admin@14` y `@google-cloud/firestore@9` piden Node ≥ 22, así que las pruebas siguen usando memoria.
- **Decisión:** mantener la API pública de los repositorios (`obtener`, `listarPorFecha`, `crear`, `cancelar`, …) y resolver el backend por variables de entorno, de modo que el proyecto siga siendo ejecutable sin credenciales. En pruebas nunca se toca Firestore real salvo `REPOSITORIO=firestore` con emulador. El acceso directo del navegador a Firestore queda prohibido por reglas; toda lectura y escritura pasa por la API con Admin SDK.

## 2026-11-16 · Menú de sesión, navegación sin subrayado y estado «Finalizada»

- **Propósito:** agrupar «Cerrar sesión» dentro del usuario logueado, quitar el subrayado de los enlaces del menú principal y mostrar como «Finalizada» una cita confirmada cuyo inicio ya pasó.
- **Evidencia:**
  - `src/components/SesionNav.tsx` — botón con el correo y el rol que despliega un menú con «Cerrar sesión»; se cierra con `Esc` (devolviendo el foco al botón) y al pulsar fuera. Usa `aria-expanded` y `aria-controls`.
  - `src/app/globals.css` — `text-decoration: none` en `.nav-list a` y estilos del botón y del menú de sesión.
  - `src/components/CitaCard.tsx` — estado derivado: `Confirmada` si el inicio es futuro, `Finalizada` si es pasada y `Cancelada` si se canceló.
  - `src/repositories/citas.{memoria,firestore}.ts` y `src/repositories/citas.ts` — `listarPorUid` para recuperar todas las citas confirmadas del usuario.
  - `src/services/citas.ts` — `listarMisCitas` separa activas e historial, e incorpora las citas pasadas al historial para que se vean como finalizadas.
  - `tests/CitaCard.test.tsx` y `tests/citas.service.test.ts` — expectativa «Finalizada» y prueba del historial con citas pasadas.
- **Validación:** `npm run lint` sin advertencias; `npx tsc --noEmit` sin errores; `npm test` (8 archivos, 57 pruebas) en verde; `npm run build` correcto; revisión manual del menú con ratón, teclado y `Esc`.
- **Decisión:** el estado «Finalizada» se calcula en la interfaz a partir de `estado` e `inicio`, sin añadirlo al esquema ni escribir documentos nuevos, para no migrar datos ni tocar las reglas de Firestore. Las citas finalizadas se listan en el historial de `/mis-citas` en lugar de desaparecer.

## 2026-11-16 · Firebase Auth real con emulador, cookie de sesión y rol admin

- **Propósito:** validar el inicio de sesión con Firebase Auth (sin depender del modo demo), comprobar que la cookie de sesión sirve para autenticar la API y que el claim `rol: "admin"` autoriza la agenda.
- **Evidencia:**
  - `scripts/admin-comun.mjs` — inicialización de Firebase Admin para scripts, con emulador o credenciales reales.
  - `scripts/asignar-admin.mjs` — asigna o retira (`--quitar`) el claim `rol: "admin"` y revoca los tokens para forzar el refresco.
  - `scripts/sembrar-emulador.mjs` — crea `admin@demo.local` y `cliente@demo.local` en el emulador (contraseña solo de demo).
  - `src/lib/firebase/client.ts` — conexión automática al emulador de Auth con `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, incluida configuración de relleno para el emulador.
  - `tests/integracion/auth.emulador.test.ts` — 4 pruebas: cookie creada por `POST /api/auth/sesion`, lectura en `/api/auth/yo`, `requerirAdmin` para el claim admin, 403 para cliente y 401 con cookie inválida.
  - `package.json` — `emuladores`, `emuladores:auth`, `test:emulador`, `test:emulador:completo`, `sembrar:emulador` y `admin:asignar`.
  - `.env.example`, `README.md` y `calidad/README.md` — runbook de emuladores, requisitos (Node 22 y JDK 21 para Firestore) y comandos.
- **Validación:** Node 22.22.0; `npm test` (8 archivos, 57 pruebas) en verde y la suite de integración omitida sin emulador; `npm run test:emulador` con el emulador de Auth en verde (4 pruebas); `npm run lint`, `npx tsc --noEmit` y `npm run build` correctos. El emulador de Firestore no arrancó porque el equipo tiene JDK 20 y `firebase-tools` exige 21+.
- **Decisión:** el flujo de Auth se prueba contra el emulador con usuarios temporales creados y borrados por la propia prueba. La suite de integración solo se activa con `EMULADOR_TEST=1` para que `npm test` siga siendo determinista y nunca dependa de un emulador encendido. El claim admin se gestiona con un script en lugar de la consola para que el paso quede reproducible.

## 2026-11-16 · Firestore contra el emulador: transacciones y doble reserva

- **Propósito:** aprovechar JDK 21 para validar la capa Firestore de extremo a extremo, incluida la garantía de que dos reservas simultáneas de la misma franja no puedan confirmarse las dos.
- **Evidencia:**
  - `tests/integracion/citas.firestore.test.ts` — 4 pruebas sobre el emulador: alta y lectura por franja/usuario, doble reserva concurrente con `Promise.allSettled` (una gana y la otra recibe `Conflicto`), cancelación atómica que mueve la cita a `historial` y libera la franja, y horario persistido en `config/horario`.
  - Limpieza de los documentos de prueba antes y después de la suite, filtrada por un `uid` único.
  - `package.json` — `test:emulador` ejecuta Auth + Firestore; `test:emulador:auth` queda como alternativa sin Java.
  - `README.md` y `calidad/README.md` — comandos, requisito de JDK 21 y alcance de las pruebas.
- **Validación:** `npm run test:emulador` en verde (2 archivos, 8 pruebas; la doble reserva tarda ~3 s por los reintentos de la transacción). `npm run lint`, `npx tsc --noEmit`, `npm test` (8 archivos, 57 pruebas) y `npm run build` correctos.
- **Decisión:** las pruebas de integración se activan solo con `EMULADOR_TEST=1` y el emulador correspondiente, de modo que `npm test` siga siendo rápido y determinista. La doble reserva se comprueba con transacciones reales del emulador, no con mocks.

## Plantilla para nuevas entradas

```md
## FECHA · Título

- **Propósito:**
- **Evidencia:**
- **Validación:**
- **Decisión:**
```
