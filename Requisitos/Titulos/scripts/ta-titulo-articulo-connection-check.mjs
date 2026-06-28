/*
  Nombre completo: ta-titulo-articulo-connection-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-connection-check.mjs
  Función o funciones:
  - Verificar comunicación interna entre HTML, apps, API client, runtime, Firebase directo y Netlify Functions.
  - Confirmar que estudiante, coordinador y administrador apunten a sus módulos correctos.
  - Confirmar que Electron abra las tres pantallas con Firebase directo.
  - Confirmar que Gemini tenga cliente, endpoint y función de respaldo.
  - Confirmar que el administrador cargue el normalizador de períodos.
*/

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, normalize } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function exists(file) {
  return existsSync(resolve(root, file));
}

function assert(errors, condition, message) {
  if (!condition) errors.push(message);
}

function extractModuleScripts(html) {
  const scripts = [];
  const regex = /<script\s+type="module"\s+src="([^"]+)"/g;
  let match = regex.exec(html);
  while (match) {
    scripts.push(match[1]);
    match = regex.exec(html);
  }
  return scripts;
}

function resolveHtmlScript(htmlFile, src) {
  return normalize(resolve(root, htmlFile, "..", src)).replace(normalize(root + "/"), "").replaceAll("\\", "/");
}

const errors = [];

const htmlFiles = [
  {
    file: "public/ta-titulo-articulo-estudiante.html",
    screen: 'data-ta-screen="estudiante"',
    app: "src/estudiante/ta-titulo-articulo-estudiante.app.js"
  },
  {
    file: "public/ta-titulo-articulo-coordinador.html",
    screen: 'data-ta-screen="coordinador"',
    app: "src/coordinador/ta-titulo-articulo-coordinador.app.js"
  },
  {
    file: "public/ta-titulo-articulo-admin.html",
    screen: 'data-ta-screen="administrador"',
    app: "src/admin/ta-titulo-articulo-admin.app.js"
  },
  {
    file: "electron/admin/ta-titulo-articulo-administrador.html",
    screen: 'data-ta-screen="administrador"',
    app: "src/admin/ta-titulo-articulo-admin.app.js"
  }
];

for (const item of htmlFiles) {
  assert(errors, exists(item.file), `No existe ${item.file}`);
  if (!exists(item.file)) continue;
  const html = read(item.file);
  assert(errors, html.includes(item.screen), `${item.file}: no declara ${item.screen}`);
  assert(errors, html.includes("firebase/app") && html.includes("firebase/firestore"), `${item.file}: falta import map de Firebase`);
  const scripts = extractModuleScripts(html).map((src) => resolveHtmlScript(item.file, src));
  assert(errors, scripts.includes(item.app), `${item.file}: no conecta con ${item.app}`);
  for (const script of scripts) assert(errors, exists(script), `${item.file}: script inexistente ${script}`);
}

const appConnections = [
  {
    file: "src/estudiante/ta-titulo-articulo-estudiante.app.js",
    required: ["TaTituloArticuloApi", "TaTituloArticuloGemini", "TaTituloArticuloLocalDraft", "enviarPropuestas", "generarSugerenciasTitulo"]
  },
  {
    file: "src/coordinador/ta-titulo-articulo-coordinador.app.js",
    required: ["TaTituloArticuloApi", "listarCoordinadores", "cargarEstudiantes", "iniciarRevision", "guardarRevision"]
  },
  {
    file: "src/admin/ta-titulo-articulo-admin.app.js",
    required: ["TaTituloArticuloApi", "TaTituloArticuloAdminLimpieza", "listarResumen", "activarPeriodo", "guardarCoordinador", "asignarCoordinadorCarrera"]
  }
];

for (const item of appConnections) {
  assert(errors, exists(item.file), `No existe ${item.file}`);
  if (!exists(item.file)) continue;
  const content = read(item.file);
  for (const value of item.required) assert(errors, content.includes(value), `${item.file}: falta conexión ${value}`);
}

const api = exists("src/services/ta-titulo-articulo-api-client.service.js") ? read("src/services/ta-titulo-articulo-api-client.service.js") : "";
assert(errors, api.includes("TaTituloArticuloRuntime"), "API client no usa runtime");
assert(errors, api.includes("ta-titulo-articulo-firebase-direct.service.js"), "API client no carga Firebase directo");
assert(errors, api.includes('origenDatos: "firebase-direct"'), "API client no retorna origen firebase-direct");
for (const method of ["buscarPorCedula", "enviarPropuestas", "listarCoordinadores", "cargarEstudiantes", "guardarRevision", "listarResumen", "activarPeriodo", "asignarCoordinadorCarrera"]) {
  assert(errors, api.includes(method), `API client: falta método ${method}`);
}

const runtime = exists("src/services/ta-titulo-articulo-runtime.service.js") ? read("src/services/ta-titulo-articulo-runtime.service.js") : "";
assert(errors, runtime.includes('return "firebase-direct"'), "Runtime no deja firebase-direct como origen principal");
assert(errors, runtime.includes("netlify-functions"), "Runtime no conserva compatibilidad con functions");

const direct = exists("src/services/ta-titulo-articulo-firebase-direct.service.js") ? read("src/services/ta-titulo-articulo-firebase-direct.service.js") : "";
for (const group of ["estudiante", "coordinador", "admin"]) assert(errors, direct.includes(`${group}: {`), `Firebase directo: falta grupo ${group}`);
for (const field of ["titulosEnviados", "tituloPreferidoNumero", "tituloCorregidoCoordinador", "observacionCoordinador", "titulos_logs"]) {
  assert(errors, direct.includes(field), `Firebase directo: falta ${field}`);
}

const electron = exists("electron/ta-titulo-articulo-main.js") ? read("electron/ta-titulo-articulo-main.js") : "";
for (const value of ["--estudiante", "--coordinador", "--admin", "taDataMode", "firebase-direct", "loadFile", "ta-titulo-articulo-admin-periodos-normalizados.app.js"]) {
  assert(errors, electron.includes(value), `Electron: falta ${value}`);
}

const netlifyFunctions = [
  "netlify/functions/ta-titulo-articulo-api-estudiante.js",
  "netlify/functions/ta-titulo-articulo-api-coordinador.js",
  "netlify/functions/ta-titulo-articulo-api-admin.js",
  "netlify/functions/ta-titulo-articulo-api-telegram.js",
  "netlify/functions/ta-titulo-articulo-gemini.js"
];
for (const file of netlifyFunctions) {
  assert(errors, exists(file), `No existe ${file}`);
  if (!exists(file)) continue;
  const content = read(file);
  assert(errors, content.includes("export async function handler"), `${file}: falta handler`);
}

const geminiClient = exists("src/services/ta-titulo-articulo-gemini-client.service.js") ? read("src/services/ta-titulo-articulo-gemini-client.service.js") : "";
const geminiFunction = exists("netlify/functions/ta-titulo-articulo-gemini.js") ? read("netlify/functions/ta-titulo-articulo-gemini.js") : "";
assert(errors, geminiClient.includes("/.netlify/functions/ta-titulo-articulo-gemini"), "Gemini client: endpoint incorrecto");
assert(errors, geminiClient.includes("fallbackLocal"), "Gemini client: falta fallback local");
assert(errors, geminiFunction.includes("sugerencias"), "Gemini function: no devuelve sugerencias");
assert(errors, geminiFunction.includes("jsonResponse"), "Gemini function: falta respuesta JSON");

const adminPublic = exists("public/ta-titulo-articulo-admin.html") ? read("public/ta-titulo-articulo-admin.html") : "";
for (const id of ["ta-admin-inicio", "ta-admin-estadisticas", "ta-admin-periodo-card", "ta-admin-coordinadores-card", "ta-admin-carreras-card", "ta-admin-estudiantes-card", "ta-admin-envios-card", "ta-admin-limpieza-card"]) {
  assert(errors, adminPublic.includes(id), `Administrador público: falta bloque ${id}`);
}
assert(errors, adminPublic.includes("ta-admin-sidebar") && adminPublic.includes("ta-admin-menu"), "Administrador público: falta panel lateral");
assert(errors, exists("src/admin/ta-titulo-articulo-admin-periodos-normalizados.app.js"), "Administrador: falta normalizador de períodos");
assert(errors, adminPublic.includes("ta-titulo-articulo-admin-periodos-normalizados.app.js"), "Administrador público: no carga normalizador de períodos");

if (errors.length) {
  console.error("Títulos: revisión de conexión con errores.");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Títulos: revisión de conexión correcta.");
console.log("HTML conectado con sus apps.");
console.log("Apps conectadas con API client.");
console.log("API client conectado con runtime y Firebase directo.");
console.log("Electron conectado con estudiante, coordinador y administrador.");
console.log("Netlify Functions y Gemini verificados.");
console.log("Panel administrador lateral verificado.");
console.log("Normalizador de períodos verificado.");
