# Evidencias de calidad

Resultados de las comprobaciones automáticas y manuales del proyecto.
Fecha de la última ejecución: **2026-11-16** · Node.js 22 · Windows.

## Comprobaciones automáticas

| Comprobación | Comando | Resultado | Evidencia |
|---|---|---|---|
| ESLint sin errores ni advertencias | `npm run lint` | ✅ 0 problemas | [`evidencias/lint.txt`](./evidencias/lint.txt) |
| TypeScript estricto | `npx tsc --noEmit` | ✅ sin errores | [`evidencias/typecheck.txt`](./evidencias/typecheck.txt) |
| Pruebas unitarias, de componentes y de API | `npm test` | ✅ 8 archivos · 57 pruebas (2 suites de integración omitidas) | [`evidencias/test.txt`](./evidencias/test.txt) |
| Integración contra emuladores | `npm run test:emulador` | ✅ 2 archivos · 8 pruebas | [`evidencias/test-emulador.txt`](./evidencias/test-emulador.txt) |
| Compilación de producción | `npm run build` | ✅ 15 rutas generadas | [`evidencias/build.txt`](./evidencias/build.txt) |
| Restricciones de IA y secretos | `node ia/restricciones-verificar.mjs` | ✅ 121 archivos versionados | [`evidencias/restricciones.txt`](./evidencias/restricciones.txt) |

Cobertura funcional de las pruebas:

- `tests/franjas.service.test.ts` — generación de franjas, días no laborales, bloqueos, horario personalizado y franjas pasadas.
- `tests/citas.service.test.ts` — creación, duplicados, límite de 2 citas activas, regla de cancelación de 2 horas, propiedad de la cita, rol admin e historial con citas finalizadas.
- `tests/api.franjas.test.ts` — contrato HTTP, zona horaria, franjas ocupadas, fecha inválida e inexistente.
- `tests/api.citas.test.ts` — reserva, 401, 400 con detalles, 415, 409, CSRF, cancelación, 404, `mis-citas` y agenda de admin (401/403).
- `tests/repositorio.test.ts` — selección Firestore/memoria según entorno, credenciales, emulador y `REPOSITORIO`.
- `tests/SlotGrid.test.tsx` — roles accesibles, estado de las franjas y navegación con flechas.
- `tests/CitaCard.test.tsx` — estado visible, botón de cancelar habilitado/deshabilitado y cita pasada/cancelada.
- `tests/integracion/auth.emulador.test.ts` — cookie de sesión con el emulador de Auth, `/api/auth/yo`, claim `rol: "admin"`, 403 para clientes y rechazo de cookies inválidas. Se omite si el emulador no está activo (`EMULADOR_TEST=1`).
- `tests/integracion/citas.firestore.test.ts` — persistencia en Firestore, doble reserva concurrente (una gana y otra recibe 409), cancelación atómica con historial y horario en `config/horario`.

## Accesibilidad (WCAG 2.2 AA)

Revisión manual en `/reservar`, `/mis-citas`, `/login` y `/admin/agenda`:

- [x] Un solo `<h1>` por página y jerarquía de encabezados correcta.
- [x] Landmarks `header`, `nav`, `main` y `footer`; enlace «Saltar al contenido».
- [x] Ningún `<div onClick>`: acciones con `<button>` y navegación con `<a>`.
- [x] Cuadrícula de franjas con `role="grid"`, filas/celdas y navegación con flechas, Home y End.
- [x] Foco visible en todos los controles; diálogos nativos `<dialog>` con `Esc` y foco atrapado por el navegador.
- [x] Formularios con `<label>` asociado y errores anunciados con `role="alert"` / `aria-live`.
- [x] Estado de las franjas comunicado por texto («Disponible»/«Ocupada»), no solo por color.
- [x] Contraste de texto ≥ 4.5:1 con las variables de `globals.css`.
- [x] Respeto a `prefers-color-scheme` y `prefers-reduced-motion`.
- [x] Diseño mobile-first sin desplazamiento horizontal a 320 px.

## Cómo reproducir Lighthouse y axe

Con la app en marcha (`npm run dev`) y Chrome instalado:

```bash
# Lighthouse (accesibilidad, rendimiento y buenas prácticas)
npx lighthouse http://localhost:3000/reservar --only-categories=accessibility,performance,best-practices --view

# axe-core sobre una página (si se tiene @axe-core/cli instalado)
npx @axe-core/cli http://localhost:3000/reservar --exit
```

Guarda los informes generados en esta carpeta (`calidad/lighthouse-*.html`,
`calidad/axe-*.json`) para adjuntarlos a la entrega.

## Limitaciones conocidas

- La app elige Firestore cuando existen credenciales `FIREBASE_*` o un emulador activo; sin ellos usa repositorios en memoria para que el modo demo siga funcionando.
- Firebase Auth y Firestore se validaron contra los emuladores: sesión con cookie, `rol: "admin"`, 403 de cliente, doble reserva concurrente, cancelación atómica y horario persistido.
- Contra un proyecto real de Firebase falta configurar las credenciales (`FIREBASE_*` y `NEXT_PUBLIC_FIREBASE_*`) y desplegar reglas e índices.
- Los datos en memoria se reinician al reiniciar el servidor; los de Firestore persisten.
