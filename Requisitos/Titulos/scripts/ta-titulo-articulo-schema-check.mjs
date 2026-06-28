/*
  Nombre completo: ta-titulo-articulo-schema-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-schema-check.mjs
  Función o funciones:
  - Revisar que cliente, funciones servidor e índices Firestore usen el mismo esquema limpio.
  - Validar nombres de colecciones oficiales y campos principales de titulos.
  - Complementar check, check:local y check:netlify antes de probar en Firebase.
*/

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const files = {
  collections: "src/firebase/ta-titulo-articulo-collections.js",
  direct: "src/services/ta-titulo-articulo-firebase-direct.service.js",
  security: "netlify/functions/ta-titulo-articulo-api-security.js",
  estudiante: "netlify/functions/ta-titulo-articulo-api-estudiante.js",
  coordinador: "netlify/functions/ta-titulo-articulo-api-coordinador.js",
  admin: "netlify/functions/ta-titulo-articulo-api-admin.js",
  indexes: "firestore/ta-titulo-articulo-firestore.indexes.json"
};

const expectedCollections = [
  'estudiantes: "Estudiantes"',
  'periodos: "periodos"',
  'config: "titulos_config"',
  'coordinadores: "titulos_coordinadores"',
  'envios: "titulos"',
  'historial: "titulos_logs"',
  'alertas: "titulos_alertas"'
];

const expectedFields = [
  "docId",
  "periodoId",
  "periodoLabel",
  "cedula",
  "nombres",
  "codigoCarrera",
  "carrera",
  "estado",
  "titulosEnviados",
  "tituloPreferidoNumero",
  "tituloElegidoNumero",
  "tituloElegidoTexto",
  "tituloCorregidoCoordinador",
  "observacionCoordinador",
  "coordinadorId",
  "coordinadorNombre",
  "intentosUsados",
  "maxIntentos",
  "reenvioDisponible",
  "creadoEn",
  "enviadoEn",
  "revisadoEn",
  "actualizadoEn"
];

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function mustExist(file, errors) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`Archivo faltante: ${file}`);
    return false;
  }
  return true;
}

const errors = [];

Object.values(files).forEach((file) => mustExist(file, errors));

if (errors.length === 0) {
  const collections = read(files.collections);
  const security = read(files.security);
  const direct = read(files.direct);
  const estudiante = read(files.estudiante);
  const coordinador = read(files.coordinador);
  const admin = read(files.admin);
  const indexes = JSON.parse(read(files.indexes));

  for (const expected of expectedCollections) {
    if (!collections.includes(expected)) errors.push(`${files.collections}: falta ${expected}`);
    if (!security.includes(expected)) errors.push(`${files.security}: falta ${expected}`);
  }

  for (const field of expectedFields) {
    if (!direct.includes(field)) errors.push(`${files.direct}: falta campo ${field}`);
  }

  for (const field of ["titulosEnviados", "tituloPreferidoNumero", "intentosUsados", "maxIntentos", "reenvioDisponible"]) {
    if (!estudiante.includes(field)) errors.push(`${files.estudiante}: falta campo ${field}`);
    if (!admin.includes(field)) errors.push(`${files.admin}: falta campo ${field}`);
  }

  for (const field of ["titulosEnviados", "tituloElegidoTexto", "tituloCorregidoCoordinador", "observacionCoordinador"]) {
    if (!coordinador.includes(field)) errors.push(`${files.coordinador}: falta campo ${field}`);
  }

  const collectionGroups = new Set((indexes.indexes || []).map((item) => item.collectionGroup));
  if (!collectionGroups.has("titulos")) errors.push(`${files.indexes}: falta collectionGroup titulos`);
  if (!collectionGroups.has("titulos_logs")) errors.push(`${files.indexes}: falta collectionGroup titulos_logs`);
}

if (errors.length) {
  console.error("Títulos: revisión de esquema con errores.");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Títulos: revisión de esquema correcta.");
console.log("Colecciones oficiales verificadas.");
console.log("Campos principales de titulos verificados.");
console.log("Índices Firestore verificados.");
