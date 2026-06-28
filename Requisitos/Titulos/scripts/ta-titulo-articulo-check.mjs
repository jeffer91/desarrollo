/*
  Nombre completo: ta-titulo-articulo-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-check.mjs
  Función o funciones:
  - Ejecutar una revisión rápida de archivos mínimos del módulo Títulos.
  - Detectar archivos faltantes antes de correr Vite, Netlify, Firebase, Gemini o Electron.
  - Validar rutas HTML principales de estudiante, coordinador y administrador.
  - Detectar HTML duplicado o pantallas mezcladas.
  - Verificar servicios centrales de runtime, Firebase directo, Gemini, Electron, pruebas locales y Netlify.
  - Servir como prueba final del bloque desde la terminal.
  Se conecta con:
  - Requisitos/Titulos/package.json
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
  - Requisitos/Titulos/public/ta-titulo-articulo-admin.html
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
  ".env.example",
  "vite.config.js",
  "README.md",
  "public/ta-titulo-articulo-estudiante.html",
  "public/ta-titulo-articulo-coordinador.html",
  "public/ta-titulo-articulo-admin.html",
  "public/assets/logo-itsqmet.svg",
  "electron/ta-titulo-articulo-main.js",
  "electron/admin/ta-titulo-articulo-administrador.html",
  "src/styles/ta-titulo-articulo-base.css",
  "src/styles/ta-titulo-articulo-layout.css",
  "src/styles/ta-titulo-articulo-components.css",
  "src/firebase/ta-titulo-articulo-firebase-sdk.service.js",
  "src/firebase/ta-titulo-articulo-firebase-client.js",
  "src/firebase/ta-titulo-articulo-collections.js",
  "src/services/ta-titulo-articulo-runtime.service.js",
  "src/services/ta-titulo-articulo-data-adapter.service.js",
  "src/services/ta-titulo-articulo-api-client.service.js",
  "src/services/ta-titulo-articulo-functions-client.service.js",
  "src/services/ta-titulo-articulo-firebase-direct.service.js",
  "src/services/ta-titulo-articulo-coherencia.service.js",
  "src/services/ta-titulo-articulo-periodos.service.js",
  "src/services/ta-titulo-articulo-local-draft.service.js",
  "src/services/ta-titulo-articulo-gemini-client.service.js",
  "src/estudiante/ta-titulo-articulo-estudiante.app.js",
  "src/coordinador/ta-titulo-articulo-coordinador.app.js",
  "src/admin/ta-titulo-articulo-admin.app.js",
  "src/admin/ta-titulo-articulo-admin-diagnostico.app.js",
  "src/admin/ta-titulo-articulo-admin-limpieza.service.js",
  "scripts/ta-titulo-articulo-local-check.mjs",
  "scripts/ta-titulo-articulo-netlify-check.mjs",
  "scripts/ta-titulo-articulo-build-local.mjs",
  "netlify/functions/ta-titulo-articulo-api-security.js",
  "netlify/functions/ta-titulo-articulo-api-estudiante.js",
  "netlify/functions/ta-titulo-articulo-api-coordinador.js",
  "netlify/functions/ta-titulo-articulo-api-admin.js",
  "netlify/functions/ta-titulo-articulo-api-telegram.js",
  "netlify/functions/ta-titulo-articulo-gemini.js"
];

const firebaseImportMapChecks = [
  '<script type="importmap">',
  '"firebase/app": "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"',
  '"firebase/firestore": "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"'
];

const packageScripts = [
  "dev",
  "dev:coordinador",
  "dev:admin",
  "dev:netlify",
  "build",
  "build:local",
  "build:netlify",
  "preview",
  "electron",
  "electron:admin",
  "electron:estudiante",
  "electron:coordinador",
  "electron:dev",
  "check",
  "check:local",
  "check:netlify",
  "check:all",
  "start"
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
      'data-ta-screen="estudiante"',
      ...firebaseImportMapChecks
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
      'data-ta-screen="coordinador"',
      ...firebaseImportMapChecks
    ],
    mustNotInclude: [
      "../src/estudiante/ta-titulo-articulo-estudiante.app.js",
      'data-ta-screen="estudiante"',
      "Estudiante | Títulos de Artículos Académicos",
      "logo-itsqmet.png"
    ]
  },
  {
    file: "public/ta-titulo-articulo-admin.html",
    mustInclude: [
      "../src/styles/ta-titulo-articulo-base.css",
      "../src/styles/ta-titulo-articulo-layout.css",
      "../src/styles/ta-titulo-articulo-components.css",
      "../src/admin/ta-titulo-articulo-admin-diagnostico.app.js",
      "../src/admin/ta-titulo-articulo-admin.app.js",
      'data-ta-screen="administrador"',
      'data-ta-runtime="public"',
      "ta-admin-envios-body",
      "ta-admin-limpiar-confirmacion",
      ...firebaseImportMapChecks
    ],
    mustNotInclude: [
      "../../src/admin/ta-titulo-articulo-admin.app.js",
      'data-ta-runtime="electron"'
    ]
  },
  {
    file: "electron/admin/ta-titulo-articulo-administrador.html",
    mustInclude: [
      "../../src/styles/ta-titulo-articulo-base.css",
      "../../src/styles/ta-titulo-articulo-layout.css",
      "../../src/styles/ta-titulo-articulo-components.css",
      "../../src/admin/ta-titulo-articulo-admin-diagnostico.app.js",
      "../../src/admin/ta-titulo-articulo-admin.app.js",
      'data-ta-screen="administrador"',
      'data-ta-runtime="electron"',
      "ta-admin-diagnostico-card",
      "ta-admin-envios-body",
      "ta-admin-limpiar-confirmacion",
      ...firebaseImportMapChecks
    ],
    mustNotInclude: [
      "../src/estudiante/ta-titulo-articulo-estudiante.app.js",
      "../src/coordinador/ta-titulo-articulo-coordinador.app.js"
    ]
  }
];

const serviceChecks = [
  { file: "src/firebase/ta-titulo-articulo-firebase-sdk.service.js", mustInclude: ["TA_TITULO_ARTICULO_FIREBASE_SDK_VERSION", "firebase/app", "firebase/firestore", "10.14.1"] },
  { file: "src/firebase/ta-titulo-articulo-firebase-client.js", mustInclude: ["import.meta.env || {}", "TA_TITULO_ARTICULO_FIREBASE_CONFIG", "firebaseDisponible", "sdkVersion"] },
  { file: "src/firebase/ta-titulo-articulo-collections.js", mustInclude: ["titulos", "titulos_coordinadores", "titulos_logs", "crearEnvioId", "normalizarEstadoTitulo"] },
  { file: "src/services/ta-titulo-articulo-runtime.service.js", mustInclude: ["TaTituloArticuloRuntime", "obtenerOrigenDatos", "firebase-direct", "netlify-functions"] },
  { file: "src/services/ta-titulo-articulo-data-adapter.service.js", mustInclude: ["TaTituloArticuloData", "ta-titulo-articulo-runtime.service.js", "ta-titulo-articulo-firebase-direct.service.js"] },
  { file: "src/services/ta-titulo-articulo-api-client.service.js", mustInclude: ["TaTituloArticuloApi", "ta-titulo-articulo-runtime.service.js", "ta-titulo-articulo-firebase-direct.service.js", "origenDatos"] },
  { file: "src/services/ta-titulo-articulo-functions-client.service.js", mustInclude: ["TaTituloArticuloFunctionsClient", "/.netlify/functions"] },
  { file: "src/services/ta-titulo-articulo-local-draft.service.js", mustInclude: ["localStorage", "ta.titulos.borrador", "TaTituloArticuloLocalDraft"] },
  { file: "src/services/ta-titulo-articulo-gemini-client.service.js", mustInclude: ["/.netlify/functions/ta-titulo-articulo-gemini", "TaTituloArticuloGemini", "fallbackLocal"] },
  { file: "src/services/ta-titulo-articulo-firebase-direct.service.js", mustInclude: ["titulosEnviados", "tituloPreferidoNumero", "tituloCorregidoCoordinador", "titulos_logs"] },
  { file: "src/admin/ta-titulo-articulo-admin-diagnostico.app.js", mustInclude: ["obtenerFirebaseConfigPublica", "obtenerOrigenDatos", "ta-admin-runtime", "ta-admin-origen"] },
  { file: "src/admin/ta-titulo-articulo-admin-limpieza.service.js", mustInclude: ["BORRAR TITULOS", "deleteDoc", "titulos_logs"] },
  { file: "electron/ta-titulo-articulo-main.js", mustInclude: ["taDataMode", "firebase-direct", "--estudiante", "--coordinador", "--admin", "setWindowOpenHandler", "loadFile"] },
  { file: "scripts/ta-titulo-articulo-local-check.mjs", mustInclude: ["Live Server", "check:local", "firebase-direct", "estudiante, coordinador y administrador"] },
  { file: "scripts/ta-titulo-articulo-netlify-check.mjs", mustInclude: ["check:netlify", "build:netlify", "Publish directory", "Functions directory", "ta-titulo-articulo-gemini.js"] },
  { file: "scripts/ta-titulo-articulo-build-local.mjs", mustInclude: ["dist-local", "manifest.local.json", "administradorPublico", "local-firebase-direct"] },
  { file: "netlify.toml", mustInclude: ["npm run build:netlify", "node_bundler = \"esbuild\"", "functions = \"netlify/functions\"", "publish = \"dist\"", "from = \"/admin\""] },
  { file: "vite.config.js", mustInclude: ["ta-titulo-articulo-estudiante.html", "ta-titulo-articulo-coordinador.html", "ta-titulo-articulo-admin.html"] },
  { file: ".env.example", mustInclude: ["FIREBASE_ADMIN_PRIVATE_KEY", "TA_TITULO_ARTICULO_ADMIN_TOKEN", "TELEGRAM_BOT_TOKEN", "GEMINI_API_KEY", "Base directory recomendada"] },
  { file: "README.md", mustInclude: ["npm run check:all", "Live Server", "npm run build:local", "Netlify, último paso"] }
];

function readRelative(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function countOccurrences(text, value) {
  return text.split(value).length - 1;
}

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`Archivo faltante: ${file}`);
}

if (existsSync(resolve(root, "package.json"))) {
  const pkg = JSON.parse(readRelative("package.json"));
  for (const scriptName of packageScripts) {
    if (!pkg.scripts?.[scriptName]) errors.push(`package.json: falta script "${scriptName}".`);
  }
}

for (const check of htmlChecks) {
  const fullPath = resolve(root, check.file);
  if (!existsSync(fullPath)) continue;

  const content = readRelative(check.file);

  if (countOccurrences(content, "<!DOCTYPE html>") !== 1) errors.push(`${check.file}: debe tener un solo <!DOCTYPE html>.`);
  if (countOccurrences(content, "<html") !== 1) errors.push(`${check.file}: debe tener una sola etiqueta <html>.`);
  if (countOccurrences(content, "</html>") !== 1) errors.push(`${check.file}: debe tener un solo cierre </html>.`);
  if (countOccurrences(content, '<script type="importmap">') !== 1) errors.push(`${check.file}: debe tener un solo import map de Firebase.`);

  for (const value of check.mustInclude) {
    if (!content.includes(value)) errors.push(`${check.file}: falta "${value}".`);
  }
  for (const value of check.mustNotInclude) {
    if (content.includes(value)) errors.push(`${check.file}: no debe contener "${value}".`);
  }
}

for (const check of serviceChecks) {
  const fullPath = resolve(root, check.file);
  if (!existsSync(fullPath)) continue;

  const content = readRelative(check.file);
  for (const value of check.mustInclude) {
    if (!content.includes(value)) errors.push(`${check.file}: falta "${value}".`);
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
console.log(`Servicios verificados: ${serviceChecks.length}`);
console.log(`Scripts package verificados: ${packageScripts.length}`);
