import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function clavePrivada() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function emuladorActivo() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

async function main() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? (emuladorActivo() ? "demo-reserva" : undefined);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = clavePrivada();

  console.log("Variables Firebase:");
  console.log(`- FIREBASE_PROJECT_ID: ${projectId ? "OK" : "FALTA"}`);
  console.log(`- FIREBASE_CLIENT_EMAIL: ${clientEmail ? "OK" : "FALTA"}`);
  console.log(`- FIREBASE_PRIVATE_KEY: ${privateKey ? "OK" : "FALTA"}`);
  console.log(`- Emulador activo: ${emuladorActivo() ? "sí" : "no"}`);

  if (!projectId) {
    console.error("No se puede inicializar Firebase: falta FIREBASE_PROJECT_ID.");
    process.exit(1);
  }

  let app;
  if (!clientEmail || !privateKey) {
    if (emuladorActivo()) {
      app = getApps()[0] ?? initializeApp({ projectId });
    } else {
      console.error("Faltan credenciales de cuenta de servicio y no hay emulador activo.");
      process.exit(1);
    }
  } else {
    app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }

  try {
    const auth = getAuth(app);
    await auth.listUsers(1);
    console.log("Auth: OK");
  } catch (error) {
    console.error(`Auth: ERROR (${error?.message ?? "desconocido"})`);
    process.exitCode = 1;
  }

  try {
    const db = getFirestore(app);
    await db.collection("citas").limit(1).get();
    console.log("Firestore: OK");
  } catch (error) {
    console.error(`Firestore: ERROR (${error?.message ?? "desconocido"})`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});