#!/usr/bin/env node
/**
 * Verificación de restricciones de la IA (sección 15).
 * No lee .env ni archivos no versionados: trabaja con `git ls-files`.
 * No sale de la carpeta del proyecto.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, "..");
const errores = [];

function dentroDelProyecto(p) {
  const rel = relative(raiz, resolve(raiz, p));
  return rel === "" || (!rel.startsWith("..") && !rel.includes(":"));
}

if (!dentroDelProyecto(".")) {
  errores.push("El script intentó operar fuera del proyecto.");
}

let archivos = [];
try {
  archivos = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: raiz,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
} catch {
  errores.push("No se pudo ejecutar `git ls-files`. ¿Es un repositorio Git?");
}

const permitidos = new Set([".env.example"]);
const envVersionados = archivos.filter(
  (f) => /(^|\/)\.env(\.|$)/.test(f) && !permitidos.has(f)
);
if (envVersionados.length) {
  errores.push(`Archivos .env versionados: ${envVersionados.join(", ")}`);
}

const patronesSecreto = [
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AIza[0-9A-Za-z\-_]{35}/,
  /"private_key"\s*:\s*"-----/,
  /(firebase_admin|service_account).*private_key/i,
  /client_secret["']?\s*[:=]\s*["'][^"']{10,}/i,
];

const extensionesCodigo = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|md)$/i;
for (const archivo of archivos) {
  if (!extensionesCodigo.test(archivo)) continue;
  if (archivo === "package-lock.json") continue;
  if (archivo === "ia/restricciones-verificar.mjs") continue; // evita auto-detección de los patrones
  if (!dentroDelProyecto(archivo)) {
    errores.push(`Ruta fuera del proyecto: ${archivo}`);
    continue;
  }
  let contenido = "";
  try {
    contenido = readFileSync(resolve(raiz, archivo), "utf8");
  } catch {
    continue;
  }
  for (const patron of patronesSecreto) {
    if (patron.test(contenido)) {
      errores.push(`Posible secreto en ${archivo}`);
      break;
    }
  }
  if (/(^|\/)src\/.*\.(tsx?|jsx?)$/.test(archivo) && /from\s+["']firebase\/firestore["']/.test(contenido)) {
    errores.push(`Import de firebase/firestore en el cliente: ${archivo}`);
  }
  if (
    /\.(tsx?|jsx?)$/.test(archivo) &&
    /dangerouslySetInnerHTML/.test(contenido) &&
    !/sanitize|DOMPurify/i.test(contenido)
  ) {
    errores.push(`dangerouslySetInnerHTML sin sanear: ${archivo}`);
  }
}

if (errores.length) {
  console.error("FALLÓ: se encontraron restricciones incumplidas:\n");
  for (const e of errores) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`OK: restricciones verificadas (${archivos.length} archivos versionados).`);
