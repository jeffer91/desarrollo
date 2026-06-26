/*
  Nombre completo: ta-titulo-articulo-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-check.mjs
  Función o funciones:
  - Ejecutar una revisión rápida de archivos mínimos del módulo Títulos.
  - Detectar archivos faltantes antes de correr Vite, Netlify, Firebase o Electron.
  - Validar rutas HTML principales de estudiante, coordinador y administrador.
  - Detectar HTML duplicado o pantallas mezcladas.
  - Servir como prueba final del bloque desde la terminal.
  Se conecta con:
  - Requisitos/Titulos/package.json
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
*/

import { existsSync, readFileSync } from "node:fs";
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

const htmlChecks = [
  {
    file: "public/ta-titulo-articulo-estudiante.html",
    mustInclude: [
      "../src/styles/ta-titulo-articulo-base.css",
      "../src/styles/ta-titulo-articulo-layout.css",
      "../src/styles/ta-titulo-articulo-components.css",
      "./assets/logo-itsqmet.svg",
      "../src/estudiante/ta-titulo-articulo-estudiante.app.js",
      'data-ta-screen="estudiante"'
    ],
    mustNotInclude: [
      "../src/coordinador/ta-titulo-articulo-coordinador.app.js",
      'data-ta-screen="coordinador"',
      "logo-itsqmet.png"
    ]
  },
  {
    file: "public/ta-titulo-articulo-coordinador.html",
    mustInclude: [
      "../src/styles/ta-titulo-articulo-base.css",
      "../src/styles/ta-titulo-articulo-layout.css",
      "../src/styles/ta-titulo-articulo-components.css",
      "./assets/logo-itsqmet.svg",
      "../src/coordinador/ta-titulo-articulo-coordinador.app.js",
      'data-ta-screen="coordinador"'
    ],
    mustNotInclude: [
      "../src/estudiante/ta-titulo-articulo-estudiante.app.js",
      'data-ta-screen="estudiante"',
      "Estudiante | Títulos de Artículos Académicos",
      "logo-itsqmet.png"
    ]
  },
  {
    file: "electron/admin/ta-titulo-articulo-administrador.html",
    mustInclude: [
      "../../src/styles/ta-titulo-articulo-base.css",
      "../../src/styles/ta-titulo-articulo-layout.css",
      "../../src/styles/ta-titulo-articulo-components.css",
      "../../src/admin/ta-titulo-articulo-admin.app.js",
      'data-ta-screen="administrador"',
      'data-ta-runtime="electron"'
    ],
    mustNotInclude: [
      "../src/estudiante/ta-titulo-articulo-estudiante.app.js",
      "../src/coordinador/ta-titulo-articulo-coordinador.app.js"
    ]
  }
];

function readRelative(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function countOccurrences(text, value) {
  return text.split(value).length - 1;
}

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`Archivo faltante: ${file}`);
  }
}

for (const check of htmlChecks) {
  const fullPath = resolve(root, check.file);
  if (!existsSync(fullPath)) continue;

  const content = readRelative(check.file);

  if (countOccurrences(content, "<!DOCTYPE html>") !== 1) {
    errors.push(`${check.file}: debe tener un solo <!DOCTYPE html>.`);
  }

  if (countOccurrences(content, "<html") !== 1) {
    errors.push(`${check.file}: debe tener una sola etiqueta <html>.`);
  }

  if (countOccurrences(content, "</html>") !== 1) {
    errors.push(`${check.file}: debe tener un solo cierre </html>.`);
  }

  for (const value of check.mustInclude) {
    if (!content.includes(value)) {
      errors.push(`${check.file}: falta "${value}".`);
    }
  }

  for (const value of check.mustNotInclude) {
    if (content.includes(value)) {
      errors.push(`${check.file}: no debe contener "${value}".`);
    }
  }
}

if (errors.length) {
  console.error("Títulos: revisión con errores.");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Títulos: revisión de estructura correcta.");
console.log(`Archivos verificados: ${requiredFiles.length}`);
console.log(`HTML verificados: ${htmlChecks.length}`);
