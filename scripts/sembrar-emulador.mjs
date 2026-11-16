#!/usr/bin/env node
/**
 * Crea usuarios de demostración en el emulador de Auth y asigna el rol admin.
 * Solo funciona con `FIREBASE_AUTH_EMULATOR_HOST`; nunca contra Firebase real.
 *
 * Uso:
 *   npm run sembrar:emulador
 */
import { authScript } from "./admin-comun.mjs";

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("Este script solo funciona con el emulador de Auth activo.");
  console.error("Ejecuta `npm run emuladores` y define FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099.");
  process.exit(1);
}

const usuarios = [
  { correo: "admin@demo.local", clave: "demo1234", rol: "admin" },
  { correo: "cliente@demo.local", clave: "demo1234", rol: "cliente" },
];

const auth = authScript();

for (const { correo, clave, rol } of usuarios) {
  let usuario;
  try {
    usuario = await auth.getUserByEmail(correo);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    usuario = await auth.createUser({ email: correo, password: clave, emailVerified: true });
  }

  await auth.setCustomUserClaims(usuario.uid, { rol });
  console.log(`${rol.padEnd(8)} ${correo} / ${clave} (uid ${usuario.uid})`);
}

console.log("Usuarios listos en el emulador de Auth.");
