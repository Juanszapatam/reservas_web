<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas del proyecto para la IA

> Configuración propia del proyecto (sección 15 del enunciado). El objetivo es que cualquier asistente de IA trabaje con el mismo stack, estructura, convenciones y restricciones de seguridad que una persona del equipo.

## 1. Contexto y objetivo

- Proyecto atómico: **reserva de citas por franjas de 30 minutos**.
- Un solo repositorio Next.js (App Router) con la interfaz y la API REST en `app/api/**`.
- Datos en **Firestore** y autenticación con **Firebase Auth**, siempre a través de la API (Admin SDK en el servidor).
- El navegador **nunca** importa `firebase/firestore`; solo usa `firebase/auth` para obtener el `idToken`.

## 2. Stack y comandos

- Next.js 16 (App Router) · React 19 · TypeScript estricto.
- Validación con **Zod**; estilos con **CSS Modules** y variables CSS.
- Pruebas con **Vitest** + **React Testing Library**.
- Comandos:
  - `npm run dev` — servidor de desarrollo.
  - `npm run build` — compilación de producción.
  - `npm run lint` — ESLint sin advertencias.
  - `npm test` — pruebas (Vitest, una sola pasada).
  - `npm run test:watch` — pruebas en modo watch.

## 3. Estructura

```text
src/app/                 # rutas, layouts y Route Handlers (API)
src/components/          # UI reutilizable y accesible
src/hooks/               # hooks (useDebounce, usePolling, …)
src/schemas/             # esquemas Zod compartidos cliente/servidor
src/services/            # reglas de negocio puras y testeables
src/repositories/        # único lugar que toca Firestore (Admin SDK)
src/lib/                 # firebase, auth, errores, http
scripts/                 # utilidades Admin SDK (rol admin, usuarios demo)
tests/                   # pruebas unitarias, de componentes, de API e integración
bruno/                   # colección de solicitudes
ia/                      # configuración y evidencias de la IA
calidad/                 # evidencias de calidad (Lighthouse, axe, capturas)
openapi.yaml             # documentación de la API
proxy.ts                 # redirección por cookie (NO es seguridad real)
```

## 4. Reglas de código

- Componentes de servidor por defecto; `"use client"` solo con estado, efectos o eventos del navegador.
- Un solo `<h1>` por página; landmarks `<header>`, `<nav>`, `<main>`, `<footer>`; HTML semántico y accesible (WCAG 2.2 AA).
- Nada de `<div onClick>`: usar `<button>` o `<a>`.
- Validación **una sola vez** con Zod en `src/schemas/`; el servidor decide siempre.
- Errores de API con forma `{ error, detalles? }`; códigos HTTP consistentes.
- Fechas ISO 8601 UTC; horas mostradas con `Intl.DateTimeFormat` y zona del negocio.
- No usar `dangerouslySetInnerHTML` sin sanear.
- CSS mobile-first, con variables y sin `!important` innecesario.
- Respetar `prefers-color-scheme` y `prefers-reduced-motion`.
- No dejar `console.log` con datos personales, tokens ni secretos.

## 5. Restricciones de seguridad para la IA

- **No leer** `.env`, `.env.*`, claves, credenciales, `*.pem`, `*.key`, ni archivos dentro de `ia/secretos/`.
- **No salir** de la carpeta del proyecto. No leer, crear ni modificar archivos fuera de este repositorio.
- **No ejecutar** comandos que modifiquen el sistema fuera del proyecto (instalaciones globales, cambios de configuración del equipo, despliegues) sin permiso explícito del usuario.
- **No hacer commit ni push** de secretos. Antes de un commit, revisar que `.env*` esté ignorado.
- **No inventar credenciales** ni conectarse a Firebase real en pruebas: simular la capa de datos.
- Toda acción con efecto externo (despliegue a Vercel, correos, cobros) requiere confirmación humana.

## 6. Reglas de calidad comprobables

- `npm run lint` sin advertencias.
- `npm run build` sin errores de TypeScript.
- `npm test` en verde.
- `node ia/restricciones-verificar.mjs` en verde (comprueba secretos, imports prohibidos y rutas).
- Las pruebas de componentes consultan por rol/etiqueta accesible, no por clases CSS.

## 7. Bitácora

Toda intervención relevante de la IA se registra en `BITACORA-IA.md` con: propósito, evidencia, validación y decisión. Las evidencias de configuración y restricciones viven en `ia/`.
