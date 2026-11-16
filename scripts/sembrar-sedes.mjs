import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const SEDES = [
  {
    id: "barberia",
    nombre: "Barbería",
    tipoNegocio: "barberia",
    servicios: [
      { id: "corte", nombre: "Corte de cabello", duracionMin: 30 },
      { id: "barba", nombre: "Arreglo de barba", duracionMin: 30 },
      { id: "corte-barba", nombre: "Corte + barba", duracionMin: 30 },
    ],
  },
  {
    id: "consultorio",
    nombre: "Consultorio",
    tipoNegocio: "consultorio",
    servicios: [
      { id: "consulta-general", nombre: "Consulta general", duracionMin: 30 },
      { id: "control", nombre: "Control", duracionMin: 30 },
      { id: "valoracion", nombre: "Valoración", duracionMin: 30 },
    ],
  },
];

function clavePrivada() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = clavePrivada();

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Faltan credenciales de Firebase. Revisa .env.local.");
    process.exit(1);
  }

  const app =
    getApps()[0] ??
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  const db = getFirestore(app);

  for (const sede of SEDES) {
    await db.collection("sedes").doc(sede.id).set(sede, { merge: true });
    console.log(`Sede creada/actualizada: ${sede.id}`);
  }

  console.log("Sedes listas.");
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});