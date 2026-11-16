# Configuración de IA del proyecto

Esta carpeta contiene la configuración y las evidencias de la sección 15 del enunciado.

## Archivos

- `../AGENTS.md` — reglas del proyecto para la IA (stack, estructura, comandos, código y seguridad).
- `restricciones-verificar.mjs` — script de verificación automática de restricciones.
- `../BITACORA-IA.md` — registro de intervenciones (propósito, evidencia, validación, decisión).
- `evidencias/` — capturas o salidas de las pruebas de restricciones.

## Restricciones que se aplican

1. La IA **no lee** `.env`, `.env.*`, claves ni credenciales.
2. La IA **no sale** de la carpeta del proyecto.
3. Las acciones con efecto fuera de la máquina (despliegues, correos, pagos) piden permiso.
4. El código que escribe la IA pasa por las mismas comprobaciones automáticas: ESLint, TypeScript, Vitest y este script.

## Cómo demostrar que funcionan

```bash
node ia/restricciones-verificar.mjs
```

El script:

- lista solo archivos versionados (`git ls-files`) para no leer contenido de `.env`;
- verifica que ningún `.env*` (salvo `.env.example`) esté versionado;
- detecta patrones de secretos en el código versionado;
- detecta imports de `firebase/firestore` en el cliente;
- detecta `dangerouslySetInnerHTML` sin `sanitize`;
- verifica que el script y los archivos que revisa están dentro del proyecto.

Salida esperada: `OK: restricciones verificadas` y código de salida `0`.
