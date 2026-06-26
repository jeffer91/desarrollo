/*
  Nombre completo: ta-titulo-articulo-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-check.mjs
  Función o funciones:
  - Ejecutar una revisión rápida de archivos mínimos del módulo Títulos.
  - Detectar archivos faltantes antes de correr Vite, Netlify, Firebase o Electron.
  - Servir como prueba final del bloque desde la terminal.
  Se conecta con:
  - Requisitos/Titulos/package.json
*/

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const requiredFiles = [
  "package.json",
  "netlify.toml",
  "vite.config.js",
  "public/ta-titulo-articulo-estudiante.html",
  "public/ta-titulo-articulo-coordinador.html",
  "public/assets/logo-itsqmet.svg",
  "electron/ta-titulo-articulo-main.js",
  "electron/admin/ta-titulo-articulo-administrador.html",
  "src/styles/ta-titulo-articulo-base.css",
  "src/styles/ta-titulo-articulo-layout.css",
  "src/styles/ta-titulo-articulo-components.css",
  "src/firebase/ta-titulo-articulo-firebase-client.js",
  "src/firebase/ta-titulo-articulo-collections.js",
  "src/services/ta-titulo-articulo-api-client.service.js",
  "src/services/ta-titulo-articulo-firebase-direct.service.js",
  "src/services/ta-titulo-articulo-coherencia.service.js",
  "src/services/ta-titulo-articulo-periodos.service.js",
  "src/estudiante/ta-titulo-articulo-estudiante.app.js",
  "src/coordinador/ta-titulo-articulo-coordinador.app.js",
  "src/admin/ta-titulo-articulo-admin.app.js"
];

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));

if (missing.length) {
  console.error("Títulos incompleto. Archivos faltantes:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Títulos: revisión de estructura correcta.");
console.log(`Archivos verificados: ${requiredFiles.length}`);
