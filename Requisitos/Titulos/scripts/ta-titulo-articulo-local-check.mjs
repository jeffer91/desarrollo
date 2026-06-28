/*
  Nombre completo: ta-titulo-articulo-local-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-local-check.mjs
  Función o funciones:
  - Revisar que el módulo pueda abrirse desde Live Server tomando como raíz la carpeta desarrollo.
  - Revisar que las rutas relativas de HTML apunten a archivos existentes.
  - Revisar que las pantallas principales tengan import map de Firebase.
  - Revisar que Electron pueda abrir estudiante, coordinador y administrador con Firebase directo.
  - Revisar comandos locales definidos en package.json.
  Se conecta con:
  - package.json
  - public/ta-titulo-articulo-estudiante.html
  - public/ta-titulo-articulo-coordinador.html
  - public/ta-titulo-articulo-admin.html
  - electron/admin/ta-titulo-articulo-administrador.html
  - electron/ta-titulo-articulo-main.js
*/

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const htmlFiles = [
  "public/ta-titulo-articulo-estudiante.html",
  "public/ta-titulo-articulo-coordinador.html",
  "public/ta-titulo-articulo-admin.html",
  "electron/admin/ta-titulo-articulo-administrador.html"
];

const expectedScripts = [
  "check",
  "check:local",
  "check:all",
  "build:local",
  "electron",
  "electron:admin",
  "electron:estudiante",
  "electron:coordinador",
  "electron:dev",
  "dev",
  "dev:coordinador",
  "dev:admin",
  "dev:netlify"
];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function dirnameOf(relativePath) {
  return relativePath.split("/").slice(0, -1).join("/") || ".";
}

function extraerRutasHtml(content) {
  const rutas = [];
  const regex = /(?:href|src)="([^"]+)"/g;
  let match;

  while ((match = regex.exec(content))) {
    const ruta = clean(match[1]);
    if (!ruta || ruta.startsWith("http") || ruta.startsWith("data:") || ruta.startsWith("#")) continue;
    rutas.push(ruta);
  }

  return rutas;
}

function resolverDesdeHtml(htmlFile, ruta) {
  return resolve(root, dirnameOf(htmlFile), ruta);
}

const errors = [];
const warnings = [];

const packagePath = resolve(root, "package.json");
if (!existsSync(packagePath)) {
  errors.push("No existe package.json.");
} else {
  const pkg = JSON.parse(read("package.json"));
  for (const scriptName of expectedScripts) {
    if (!pkg.scripts?.[scriptName]) errors.push(`package.json: falta script ${scriptName}.`);
  }
}

for (const htmlFile of htmlFiles) {
  const fullPath = resolve(root, htmlFile);
  if (!existsSync(fullPath)) {
    errors.push(`No existe ${htmlFile}.`);
    continue;
  }

  const content = read(htmlFile);
  const rutas = extraerRutasHtml(content);

  if (!content.includes('<script type="importmap">')) {
    errors.push(`${htmlFile}: falta import map para Firebase.`);
  }

  if (!content.includes("firebase/app") || !content.includes("firebase/firestore")) {
    errors.push(`${htmlFile}: import map incompleto para Firebase.`);
  }

  for (const ruta of rutas) {
    const target = resolverDesdeHtml(htmlFile, ruta);
    if (!existsSync(target)) {
      errors.push(`${htmlFile}: ruta no encontrada ${ruta}.`);
    }
  }
}

const electronMain = "electron/ta-titulo-articulo-main.js";
if (existsSync(resolve(root, electronMain))) {
  const mainContent = read(electronMain);
  for (const value of ['taDataMode: "firebase-direct"', "--estudiante", "--coordinador", "--admin", "public", "ta-titulo-articulo-estudiante.html", "ta-titulo-articulo-coordinador.html", "ta-titulo-articulo-administrador.html"]) {
    if (!mainContent.includes(value)) errors.push(`${electronMain}: falta ${value}.`);
  }
  if (!mainContent.includes("setWindowOpenHandler")) {
    warnings.push("electron/ta-titulo-articulo-main.js: no se detectó bloqueo de nuevas ventanas externas.");
  }
}

if (errors.length) {
  console.error("Títulos: revisión local con errores.");
  errors.forEach((error) => console.error(`- ${error}`));
  if (warnings.length) {
    console.warn("Advertencias:");
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }
  process.exit(1);
}

console.log("Títulos: revisión local correcta.");
console.log("Modo Live Server desde carpeta desarrollo: rutas compatibles.");
console.log("Modo Electron: Firebase directo forzado para estudiante, coordinador y administrador.");
console.log("Modo doble click: estructura local preparada; requiere internet para CDN Firebase.");
if (warnings.length) {
  console.warn("Advertencias:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
