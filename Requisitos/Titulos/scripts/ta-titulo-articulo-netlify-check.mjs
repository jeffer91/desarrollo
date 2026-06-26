/*
  Nombre completo: ta-titulo-articulo-netlify-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-netlify-check.mjs
  Función o funciones:
  - Validar configuración mínima antes de publicar en Netlify.
  - Revisar netlify.toml, funciones, variables ejemplo y build público.
  - Confirmar que Netlify sea el último paso después de las pruebas locales.
  - No valida secretos reales; solo revisa que las claves esperadas estén documentadas.
  Se conecta con:
  - netlify.toml
  - .env.example
  - package.json
  - vite.config.js
  - netlify/functions/*
*/

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const requiredFiles = [
  "netlify.toml",
  ".env.example",
  "vite.config.js",
  "package.json",
  "netlify/functions/ta-titulo-articulo-api-security.js",
  "netlify/functions/ta-titulo-articulo-api-estudiante.js",
  "netlify/functions/ta-titulo-articulo-api-coordinador.js",
  "netlify/functions/ta-titulo-articulo-api-admin.js",
  "netlify/functions/ta-titulo-articulo-api-telegram.js"
];

const requiredEnv = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "TA_TITULO_ARTICULO_ADMIN_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`Archivo faltante: ${file}`);
}

if (existsSync(resolve(root, "netlify.toml"))) {
  const toml = read("netlify.toml");
  const checks = [
    'command = "npm run build:netlify"',
    'publish = "dist"',
    'functions = "netlify/functions"',
    'node_bundler = "esbuild"',
    'from = "/"',
    'from = "/estudiante"',
    'from = "/coordinador"'
  ];

  for (const value of checks) {
    if (!toml.includes(value)) errors.push(`netlify.toml: falta ${value}`);
  }
}

if (existsSync(resolve(root, ".env.example"))) {
  const envExample = read(".env.example");
  for (const key of requiredEnv) {
    if (!envExample.includes(`${key}=`)) errors.push(`.env.example: falta ${key}.`);
  }
}

if (existsSync(resolve(root, "package.json"))) {
  const pkg = JSON.parse(read("package.json"));
  const scripts = ["check:netlify", "build:netlify", "dev:netlify"];
  for (const script of scripts) {
    if (!pkg.scripts?.[script]) errors.push(`package.json: falta script ${script}.`);
  }
}

if (existsSync(resolve(root, "vite.config.js"))) {
  const vite = read("vite.config.js");
  for (const value of ["ta-titulo-articulo-estudiante.html", "ta-titulo-articulo-coordinador.html", "outDir: \"dist\""]) {
    if (!vite.includes(value)) errors.push(`vite.config.js: falta ${value}.`);
  }
}

if (errors.length) {
  console.error("Títulos: revisión Netlify con errores.");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Títulos: revisión Netlify correcta.");
console.log("Base directory recomendada en Netlify: Requisitos/Titulos");
console.log("Build command: npm run build:netlify");
console.log("Publish directory: dist");
console.log("Functions directory: netlify/functions");
