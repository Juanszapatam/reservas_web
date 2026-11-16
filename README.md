# Reserva de citas por franjas

Calendario de franjas de 30 minutos donde los clientes reservan y el negocio gestiona su agenda.

> Proyecto del curso: Next.js (App Router) con API REST propia y Firebase (Auth + Firestore).
> La app funciona sin credenciales con **datos demo en memoria**; al configurar Firebase
> (o los emuladores) usa Firestore y Firebase Auth reales.

## Requisitos

- Node.js 22 LTS (`firebase-admin`, `@google-cloud/firestore` y Firebase Auth).
- **JDK 21 o superior** solo si vas a levantar el emulador de Firestore.
- npm.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa las variables cuando integres Firebase
npm run dev
```

Abre <http://localhost:3000>.

> En Windows (PowerShell): `Copy-Item .env.example .env.local`.
> Sin variables de Firebase y con `NODE_ENV` distinto de `production`, la app usa
> **modo demo**: en `/login` puedes entrar como cliente o administrador.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compilación de producción. |
| `npm start` | Servidor de producción (después del build). |
| `npm run lint` | ESLint sin advertencias. |
| `npm test` | Pruebas con Vitest (una pasada). |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run emuladores` | Emuladores de Auth y Firestore (requiere JDK 21). |
| `npm run emuladores:auth` | Solo el emulador de Auth (sin Java). |
| `npm run test:emulador` | Integración de Auth y Firestore contra emuladores (JDK 21). |
| `npm run test:emulador:auth` | Solo integración de Auth (sin Java). |
| `npm run sembrar:emulador` | Crea los usuarios demo en el emulador de Auth. |
| `npm run admin:asignar -- correo@x` | Asigna o retira (`--quitar`) el claim `rol: "admin"`. |
| `node ia/restricciones-verificar.mjs` | Verifica restricciones de la IA y ausencia de secretos. |

## Funcionalidad

- `/reservar?fecha=YYYY-MM-DD`: selector de día y cuadrícula de franjas accesible
  (`role="grid"`, flechas, Home/End), estados de carga, error, vacío y reintento.
- Reserva autenticada con confirmación, actualización optimista y descarga `.ics`.
- `/mis-citas`: citas activas e historial, cancelación con confirmación y regla de
  2 horas antes.
- `/admin/agenda`: agenda del día (con sondeo cada 30 s), cancelación de citas y
  edición del horario del negocio; los cambios recalculan las franjas.
- `/login`: Firebase Auth cuando está configurado, o acceso demo en desarrollo.

### Reglas de negocio

- Franjas de 30 minutos dentro del horario y la zona horaria del negocio.
- Máximo **2 citas activas** por usuario.
- Cancelación permitida hasta **2 horas antes** del inicio.
- Una franja solo puede tener una cita confirmada.
- No se puede reservar en días no laborales, días bloqueados ni franjas pasadas.

## Persistencia: Firestore y modo demo

La app elige el repositorio automáticamente:

| Situación | Repositorio |
|---|---|
| `REPOSITORIO=memoria` | Memoria (siempre). |
| `NODE_ENV=test` sin `REPOSITORIO=firestore` | Memoria (las pruebas nunca tocan Firebase real). |
| `REPOSITORIO=firestore` + emulador | Firestore (emulador). |
| Credenciales `FIREBASE_*` válidas | Firestore (producción). |
| Sin credenciales | Memoria (modo demo). |

Modelo de datos:

- `citas/{franja}`: cita activa. El ID es la franja (`2030-01-02T15-00`), así que
  dos reservas simultáneas de la misma franja no pueden ganar las dos.
- `historial/{autoId}`: citas canceladas, conservando el `uid` y el `inicio`.
- `config/horario`: horario, zona horaria, días laborales y bloqueos.

La reserva y la cancelación usan `runTransaction`: crear una cita comprueba y
escribe el documento en la misma transacción; cancelar mueve la cita al
historial y libera la franja de forma atómica. Los índices compuestos están en
`firestore.indexes.json` y las reglas en `firestore.rules` (todo el acceso de
cliente está denegado; solo la API con Admin SDK puede leer y escribir).

### Firebase real

1. Crea un proyecto en Firebase y habilita **Authentication → Email/Password**.
2. Genera una cuenta de servicio y copia `project_id`, `client_email` y
   `private_key` a `.env.local` (`FIREBASE_*`).
3. Completa también `NEXT_PUBLIC_FIREBASE_*` para el login del navegador.
4. Publica reglas e índices (requiere `firebase login` y confirmación humana):

   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

5. Asigna el rol de administrador con una custom claim `rol: "admin"`:

   ```bash
   npm run admin:asignar -- admin@tudominio.com
   ```

   El usuario debe volver a iniciar sesión para recibir el nuevo claim.
   Para retirarlo: `npm run admin:asignar -- admin@tudominio.com --quitar`.

### Emuladores

El emulador de Auth funciona con `firebase-tools`; el de Firestore necesita
**JDK 21 o superior**.

```bash
npm run emuladores          # Auth (9099) + Firestore (8080) + UI (4000)
npm run emuladores:auth     # solo Auth, si no tienes JDK 21
```

En otra terminal, crea los usuarios demo (solo con el emulador de Auth activo):

```bash
npm run sembrar:emulador
# admin@demo.local   / demo1234  (rol admin)
# cliente@demo.local / demo1234  (rol cliente)
```

Para que la app use los emuladores, añade a `.env.local` mientras estén activos:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080   # solo si el emulador de Firestore está activo
REPOSITORIO=firestore                    # opcional: fuerza Firestore
```

Con `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` el navegador conecta el SDK web al
emulador y el login por correo funciona con los usuarios sembrados. Sin esa
variable, `/login` mantiene el acceso demo (`demo-cliente` / `demo-admin`).

Pruebas de integración (arrancan y apagan los emuladores automáticamente):

```bash
npm run test:emulador       # Auth (cookie y rol admin) + Firestore (transacciones)
npm run test:emulador:auth  # solo Auth, si no tienes JDK 21
```

## Rutas

| Ruta | Estado |
|---|---|
| `/` | Información del negocio. |
| `/reservar?fecha=YYYY-MM-DD` | Cuadrícula de franjas y reserva. |
| `/mis-citas` | Citas activas, historial y cancelación. |
| `/admin/agenda` | Agenda y configuración del horario (rol admin). |
| `/login` | Inicio de sesión (Firebase o demo). |
| `GET /api/franjas?fecha=YYYY-MM-DD` | Franjas libres/ocupadas del día. |
| `POST /api/citas` | Crea una cita para el usuario autenticado. |
| `DELETE /api/citas/{franja}` | Cancela una cita propia (o cualquiera si es admin). |
| `GET /api/mis-citas` | Citas activas e historial del usuario. |
| `GET /api/admin/agenda?fecha=YYYY-MM-DD` | Agenda del día (solo admin). |
| `GET/PUT /api/config/horario` | Consulta el horario; lo actualiza solo el admin. |
| `POST/DELETE /api/auth/sesion` | Crea o elimina la cookie de sesión con Firebase. |
| `GET /api/auth/yo` | Usuario de la sesión actual. |
| `POST/DELETE /api/auth/demo` | Acceso demo (solo fuera de producción). |

La documentación completa está en [`openapi.yaml`](./openapi.yaml) y la colección
de solicitudes en [`bruno/`](./bruno/README.md).

## Estructura

```text
src/app/                 # rutas, layouts y Route Handlers
src/components/          # UI reutilizable y accesible
src/hooks/               # hooks (usePolling, useDebounce, useHidratado…)
src/schemas/             # esquemas Zod compartidos cliente/servidor
src/services/            # reglas de negocio puras y testeables
src/repositories/        # acceso a datos (Firestore o memoria)
src/lib/                 # Firebase, auth, errores, HTTP, fechas
scripts/                 # utilidades Admin SDK (rol admin, usuarios demo)
tests/                   # pruebas unitarias, de componentes, de API e integración
bruno/                   # colección de solicitudes
ia/                      # configuración y evidencias de la IA
calidad/                 # evidencias de calidad
openapi.yaml             # documentación de la API
proxy.ts                 # redirección por cookie (NO es seguridad real)
```

## Pruebas y calidad

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:emulador
npm run build
node ia/restricciones-verificar.mjs
```

Resultados y evidencias en [`calidad/README.md`](./calidad/README.md).

## Configuración de IA

La configuración propia está en [`AGENTS.md`](./AGENTS.md) y en [`ia/README.md`](./ia/README.md).
La bitácora está en [`BITACORA-IA.md`](./BITACORA-IA.md).

## Seguridad

- `.env*` ignorado por Git; solo se versiona `.env.example`.
- Las variables `FIREBASE_*` son exclusivas del servidor; `NEXT_PUBLIC_FIREBASE_*`
  solo contiene configuración web pública.
- La sesión viaja en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Verificación de `Origin` en peticiones que modifican datos (CSRF) y límite de
  peticiones por IP.
- El navegador nunca usa Firestore; todo pasa por la API con el Admin SDK.
- Las reglas de Firestore están en `firestore.rules` y deniegan todo el acceso de
  cliente (`allow read, write: if false`).
- La CSP incluye `connect-src` para Firebase Auth (producción) o el emulador
  (desarrollo), evitando bloquear el login en producción.
- El limitador de peticiones es por proceso/instancia; en despliegues serverless
  no es global. Para límites compartidos se recomienda un almacén externo
  (Redis/Upstash) si el tráfico lo requiere.
- Las respuestas de la API incluyen `Cache-Control: no-store` para evitar caché
  de datos sensibles.

## Notas

- El proyecto fija Node.js 22 con `engines` y `.nvmrc`. Si tu npm muestra conflictos
  de peers, usa `npm install --legacy-peer-deps`.
- Los repositorios en memoria se reinician al reiniciar el servidor; los datos de
  Firestore persisten.
- En producción (`NODE_ENV=production`) el modo demo se desactiva; se requieren las
  variables `FIREBASE_*` y Node.js 22+.
- `.firebaserc` usa el proyecto de ejemplo `demo-reserva`; cámbialo por el tuyo
  antes de desplegar reglas o índices.
