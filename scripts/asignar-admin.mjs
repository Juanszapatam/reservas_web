#!/usr/bin/env node
/**
 * Asigna o retira el custom claim `rol: "admin"` a un usuario de Firebase Auth.
 *
 * Uso:
 *   node --env-file-if-exists=.env.local scripts/asignar-admin.mjs correo@ejemplo.com
 *   node --env-file-if-exists=.env.local scripts/asignar-admin.mjs correo@ejemplo.com --quitar
 *
 * Con el emulador de Auth:
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/asignar-admin.mjs correo@ejemplo.com
 */
import { authScript, EMULADOR } from "./admin-comun.mjs";

const correo = process.argv[2];
const quitar = process.argv.includes("--quitar");

if (!correo || correo.startsWith("--")) {
  console.error("Uso: node scripts/asignar-admin.mjs <correo> [--quitar]");
  process.exit(1);
}

try {
  const auth = authScript();
  const usuario = await auth.getUserByEmail(correo);
  const claims = { ...(usuario.customClaims ?? {}) };

  if (quitar) {
    delete claims.rol;
  } else {
    claims.rol = "admin";
  }

  await auth.setCustomUserClaims(usuario.uid, claims);
  await auth.revokeRefreshTokens(usuario.uid);

  console.log(
    `${quitar ? "Retirado" : "Asignado"} el rol admin a ${correo} (uid ${usuario.uid}).`
  );
  console.log("El usuario debe volver a iniciar sesión para recibir el nuevo claim.");
  if (EMULADOR) {
    console.log("Cambio aplicado en el emulador de Auth.");
  }
} catch (error) {
  console.error(
    "No se pudo actualizar el rol:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
