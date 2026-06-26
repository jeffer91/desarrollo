/*
  Nombre completo: ta-titulo-articulo-build-local.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-build-local.mjs
  Función o funciones:
  - Crear una carpeta dist-local para pruebas sin Netlify.
  - Copiar public, src y electron/admin preservando rutas relativas.
  - Generar un manifiesto de pruebas locales.
  - Facilitar doble click y Live Server sin modificar los archivos fuente.
  Se conecta con:
  - package.json
  - public/
  - src/
  - electron/admin/
*/

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");
const outDir = resolve(root, "dist-local");

const foldersToCopy = [
  ["public", "public"],
  ["src", "src"],
  ["electron/admin", "electron/admin"]
];

function copyFolder(from, to) {
  const source = resolve(root, from);
  const target = resolve(outDir, to);
  if (!existsSync(source)) throw new Error(`No existe la carpeta origen: ${from}`);
  cpSync(source, target, { recursive: true });
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const [from, to] of foldersToCopy) {
  copyFolder(from, to);
}

const manifest = {
  nombre: "Títulos de Artículos Académicos - Local",
  generadoEn: new Date().toISOString(),
  modo: "local-firebase-direct",
  entradas: {
    estudiante: "dist-local/public/ta-titulo-articulo-estudiante.html",
    coordinador: "dist-local/public/ta-titulo-articulo-coordinador.html",
    administradorElectronHtml: "dist-local/electron/admin/ta-titulo-articulo-administrador.html"
  },
  notas: [
    "Abrir los HTML por doble click o con Live Server.",
    "Firebase directo usa import map con CDN, por lo que necesita internet.",
    "Netlify no se usa en esta carpeta local."
  ]
};

writeFileSync(resolve(outDir, "manifest.local.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log("Títulos: carpeta local generada correctamente.");
console.log("Salida: dist-local");
console.log("Abrir estudiante: dist-local/public/ta-titulo-articulo-estudiante.html");
console.log("Abrir coordinador: dist-local/public/ta-titulo-articulo-coordinador.html");
