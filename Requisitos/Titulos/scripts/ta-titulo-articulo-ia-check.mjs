/*
  Nombre completo: ta-titulo-articulo-ia-check.mjs
  Ruta o ubicación: /Requisitos/Titulos/scripts/ta-titulo-articulo-ia-check.mjs
  Función o funciones:
  - Revisar la integración final del botón inteligente, motores externos y motor local.
  - Validar que el administrador tenga vista IA o inyección automática de la vista IA.
  - Confirmar que las pruebas IA se ejecuten por función protegida con token administrativo.
  - Probar el motor local sin consumir internet ni claves reales.
  - Verificar que los resultados IA se pinten con nodos de texto y no como HTML.
  - Verificar que el motor local convierta frases informales en lenguaje académico.
  - Verificar que el motor local genere 3 sugerencias por momento investigativo.
  Se conecta con:
  - package.json
  - src/services/ta-titulo-articulo-motor-local.service.js
  - src/services/ta-titulo-articulo-gemini-client.service.js
  - src/admin/ta-titulo-articulo-admin-navegacion.app.js
  - src/admin/ta-titulo-articulo-admin-ia.app.js
  - netlify/functions/ta-titulo-articulo-api-ia.js
*/

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");
const errors = [];

const requiredFiles = [
  "src/services/ta-titulo-articulo-motor-local.service.js",
  "src/services/ta-titulo-articulo-gemini-client.service.js",
  "src/admin/ta-titulo-articulo-admin-navegacion.app.js",
  "src/admin/ta-titulo-articulo-admin-ia.app.js",
  "src/styles/ta-titulo-articulo-admin-vistas.css",
  "netlify/functions/ta-titulo-articulo-api-ia.js",
  "public/ta-titulo-articulo-admin.html",
  "electron/admin/ta-titulo-articulo-administrador.html"
];

function readRelative(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function requireIncludes(file, values) {
  if (!existsSync(resolve(root, file))) return;
  const content = readRelative(file);
  values.forEach((value) => {
    if (!content.includes(value)) errors.push(`${file}: falta "${value}".`);
  });
}

function requireNotIncludes(file, values) {
  if (!existsSync(resolve(root, file))) return;
  const content = readRelative(file);
  values.forEach((value) => {
    if (content.includes(value)) errors.push(`${file}: no debe contener "${value}".`);
  });
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`Archivo faltante: ${file}`);
}

requireIncludes("src/services/ta-titulo-articulo-gemini-client.service.js", [
  "TaTituloArticuloMotorLocal",
  "generarSugerenciasTitulo",
  "motor académico local interno",
  "3 sugerencias"
]);

requireIncludes("src/services/ta-titulo-articulo-motor-local.service.js", [
  "generarSugerenciasTitulo",
  "local-inteligente",
  "motor académico local",
  "academizar",
  "bajo nivel de ventas",
  "detectarEtapaFinal",
  "Evaluación de los resultados",
  "Diseño y validación",
  "Análisis del impacto"
]);

requireIncludes("netlify/functions/ta-titulo-articulo-api-ia.js", [
  "requireAdminToken(event)",
  "estadoIA",
  "probarGemini",
  "probarGroq",
  "probarLocal",
  "no expuestas"
]);

requireIncludes("src/admin/ta-titulo-articulo-admin-ia.app.js", [
  "ta-titulo-articulo-api-ia",
  "x-ta-admin-token",
  "ta-admin-ia-gemini-btn",
  "ta-admin-ia-groq-btn",
  "ta-admin-ia-local-btn",
  "document.createTextNode"
]);

requireNotIncludes("src/admin/ta-titulo-articulo-admin-ia.app.js", [
  "PRIVATE_KEY",
  "innerHTML"
]);

requireIncludes("src/admin/ta-titulo-articulo-admin-navegacion.app.js", [
  "insertarMenuIA",
  "insertarVistaIA",
  "cargarModuloIA",
  "IA y conexiones"
]);

requireIncludes("public/ta-titulo-articulo-admin.html", [
  'data-ta-admin-tab="ia"',
  'data-ta-admin-view="ia"',
  "ta-admin-ia-gemini-btn",
  "ta-admin-ia-groq-btn",
  "ta-admin-ia-local-btn"
]);

requireIncludes("src/styles/ta-titulo-articulo-admin-vistas.css", [
  ".ta-admin-menu__link--active",
  ".ta-admin-view[hidden]"
]);

try {
  const mod = await import(pathToFileURL(resolve(root, "src/services/ta-titulo-articulo-motor-local.service.js")).href);
  const resultado = mod.TaTituloArticuloMotorLocal.generarSugerenciasTitulo({
    carrera: "Administración de Empresas",
    temaGeneral: "captación de clientes",
    problemaNecesidad: "baja captación de clientes",
    lugarContexto: "Quito",
    grupoEstudio: "microemprendimientos",
    anioPeriodoDatos: "2026",
    objetivoArticulo: "Analizar la captación de clientes para proponer una mejora comercial.",
    resultadoEsperado: "Estrategia de mejora comercial para fortalecer la captación de clientes.",
    numeroTitulo: 1,
    titulosYaGenerados: []
  });

  assert(resultado?.ok === true, "Motor local: debe devolver ok=true.");
  assert(resultado?.origen === "fallback-local", "Motor local: debe devolver origen fallback-local.");
  assert(Array.isArray(resultado?.sugerencias), "Motor local: debe devolver arreglo de sugerencias.");
  assert(resultado.sugerencias.length === 3, "Motor local: debe devolver exactamente 3 sugerencias.");
  assert(resultado.sugerencias.every((item) => typeof item === "string" && item.length > 20), "Motor local: las sugerencias deben estar redactadas y no vacías.");
  assert(new Set(resultado.sugerencias.map((item) => item.toLowerCase())).size === 3, "Motor local: las sugerencias deben ser diferentes.");
  assert(resultado.sugerencias[0].toLowerCase().includes("diagnóstico") || resultado.sugerencias[0].toLowerCase().includes("diagnostico"), "Motor local: la primera sugerencia debe ser de inicio/diagnóstico.");
  assert(resultado.sugerencias[1].toLowerCase().includes("propuesta") || resultado.sugerencias[1].toLowerCase().includes("plan"), "Motor local: la segunda sugerencia debe ser de proceso/propuesta.");
  assert(resultado.sugerencias[2].toLowerCase().includes("evaluación") || resultado.sugerencias[2].toLowerCase().includes("evaluacion") || resultado.sugerencias[2].toLowerCase().includes("validación") || resultado.sugerencias[2].toLowerCase().includes("validacion") || resultado.sugerencias[2].toLowerCase().includes("impacto"), "Motor local: la tercera sugerencia debe ser de resultados, validación o impacto.");

  const fraseInformal = ["no", "venden"].join(" ");
  const informal = mod.TaTituloArticuloMotorLocal.generarSugerenciasTitulo({
    carrera: "Administración de Empresas",
    temaGeneral: fraseInformal,
    problemaNecesidad: fraseInformal,
    lugarContexto: "Quito",
    grupoEstudio: "microemprendimientos",
    anioPeriodoDatos: "2026",
    objetivoArticulo: "Analizar el problema comercial para proponer una mejora.",
    resultadoEsperado: "Propuesta de mejora comercial.",
    numeroTitulo: 1,
    titulosYaGenerados: []
  });
  const informalTexto = informal.sugerencias.join(" ").toLowerCase();
  assert(!informalTexto.includes(fraseInformal), "Motor local: no debe copiar frases informales en el título final.");
  assert(informalTexto.includes("bajo nivel de ventas"), "Motor local: debe convertir la frase informal en lenguaje académico.");

  const academico = mod.TaTituloArticuloMotorLocal.generarSugerenciasTitulo({
    carrera: "Administración de Empresas",
    temaGeneral: "mejorar los artículos académicos",
    problemaNecesidad: "los estudiantes no saben escribir bien y sacan artículos malos, o con muchos errores",
    lugarContexto: "ITSQMET",
    grupoEstudio: "PVC - programa de validación de conocimientos",
    anioPeriodoDatos: "2025",
    objetivoArticulo: "mejorar los artículos académicos",
    resultadoEsperado: "Propuesta de mejora relacionada con mejorar los artículos académicos para estudiantes.",
    numeroTitulo: 1,
    titulosYaGenerados: []
  });
  const academicoTexto = academico.sugerencias.join(" ").toLowerCase();
  assert(academico.sugerencias.length === 3, "Motor local académico: debe devolver 3 sugerencias.");
  assert(academicoTexto.includes("programa de validación de conocimientos".toLowerCase()), "Motor local académico: debe normalizar PVC.");
  assert(academicoTexto.includes("evaluación de los resultados".toLowerCase()), "Motor local académico: debe agregar tercera sugerencia de resultados por defecto.");
  assert(!academicoTexto.includes("sacan artículos malos"), "Motor local académico: no debe copiar lenguaje informal.");
} catch (error) {
  errors.push(`Motor local: prueba fallida. ${error.message || error}`);
}

if (errors.length) {
  console.error("Títulos IA: diagnóstico con errores.");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Títulos IA: diagnóstico final correcto.");
console.log("- Motor local inteligente disponible.");
console.log("- Cliente de sugerencias conectado al motor interno.");
console.log("- Administrador con IA y conexiones.");
console.log("- Pruebas IA protegidas por token administrativo.");
console.log("- Resultados IA renderizados de forma segura.");
console.log("- Frases informales convertidas en lenguaje académico.");
console.log("- Motor local genera 3 sugerencias por momento investigativo.");
