/*
  Nombre completo: ta-titulo-articulo-motor-local.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js
  Función: generar sugerencias académicas locales de títulos sin depender de Gemini.
*/

const FILE_PATH = "Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizar(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function limpiarFrase(value) {
  return clean(value)
    .replace(/^(tema|problema|objetivo|resultado)\s*[:.-]\s*/i, "")
    .replace(/^(analisis|análisis|diagnostico|diagnóstico|propuesta|estrategia|plan|diseño|diseno)\s+de\s+/i, "")
    .replace(/[.;,:]+$/g, "")
    .trim();
}

function minusculaInicial(value) {
  const texto = limpiarFrase(value);
  return texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : "";
}

function detectarArea(carrera = "") {
  const texto = normalizar(carrera);
  if (texto.includes("enfermer") || texto.includes("salud")) return "salud";
  if (texto.includes("software") || texto.includes("sistema") || texto.includes("informatica") || texto.includes("electronica")) return "tecnologia";
  if (texto.includes("automotriz") || texto.includes("mecanica")) return "automotriz";
  if (texto.includes("educacion") || texto.includes("docencia")) return "educacion";
  if (texto.includes("gastronomia") || texto.includes("alimentos")) return "gastronomia";
  if (texto.includes("estetica") || texto.includes("belleza")) return "estetica";
  return "administracion";
}

function contexto(payload = {}) {
  const grupo = limpiarFrase(payload.grupoEstudio);
  const lugar = limpiarFrase(payload.lugarContexto);
  const periodo = limpiarFrase(payload.anioPeriodoDatos || payload.anioPeriodo);
  let salida = grupo && lugar ? `en ${grupo} de ${lugar}` : grupo ? `en ${grupo}` : lugar ? `en ${lugar}` : "en el contexto seleccionado";
  if (periodo) salida += `, ${periodo}`;
  return salida;
}

function limpiarTitulo(value) {
  const texto = clean(value)
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\ben\s+en\b/gi, "en")
    .replace(/[.;]+$/g, "")
    .trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

function dedupe(titulos = [], previos = []) {
  const usados = new Set(previos.map(normalizar).filter(Boolean));
  const salida = [];
  titulos.forEach((titulo) => {
    const limpio = limpiarTitulo(titulo);
    const key = normalizar(limpio);
    if (!limpio || usados.has(key) || salida.some((item) => normalizar(item) === key)) return;
    salida.push(limpio);
  });
  return salida;
}

function areaTextos(area) {
  const mapa = {
    salud: ["Análisis de", "Estrategia de mejora para", "la atención sanitaria"],
    tecnologia: ["Evaluación de", "Diseño de una solución para", "el proceso tecnológico"],
    automotriz: ["Diagnóstico de", "Plan de mejora técnica para", "el sistema automotriz"],
    educacion: ["Análisis de", "Estrategia didáctica para", "el proceso de aprendizaje"],
    gastronomia: ["Evaluación de", "Propuesta de mejora para", "el proceso alimentario"],
    estetica: ["Análisis de", "Protocolo de mejora para", "el procedimiento estético"],
    administracion: ["Diagnóstico de", "Plan de mejora para", "la gestión organizacional"]
  };
  return mapa[area] || mapa.administracion;
}

function validar(payload = {}) {
  const obligatorios = [
    ["carrera", payload.carrera],
    ["tema general", payload.temaGeneral],
    ["problema o necesidad", payload.problemaNecesidad],
    ["lugar o contexto", payload.lugarContexto],
    ["grupo de estudio", payload.grupoEstudio],
    ["objetivo del artículo", payload.objetivoArticulo],
    ["resultado esperado", payload.resultadoEsperado]
  ];
  const faltante = obligatorios.find(([, value]) => !clean(value));
  if (faltante) throw new Error(`[Archivo: ${FILE_PATH}] Complete el campo ${faltante[0]} antes de generar sugerencias.`);
}

function generarSugerenciasTitulo(payload = {}, options = {}) {
  validar(payload);
  const area = detectarArea(payload.carrera);
  const [prefijoDiagnostico, prefijoPropuesta, temaBase] = areaTextos(area);
  const tema = minusculaInicial(payload.temaGeneral) || temaBase;
  const problema = minusculaInicial(payload.problemaNecesidad) || "la problemática identificada";
  const resultado = minusculaInicial(payload.resultadoEsperado) || "la mejora del proceso";
  const donde = contexto(payload);
  const previos = Array.isArray(payload.titulosYaGenerados) ? payload.titulosYaGenerados : [];

  const sugerencias = dedupe([
    `${prefijoDiagnostico} ${tema} frente a ${problema} ${donde}`,
    `${prefijoPropuesta} ${tema} orientado a ${resultado} ${donde}`,
    `Evaluación de ${tema} ${donde}`,
    `Diseño de una propuesta de mejora frente a ${problema} ${donde}`
  ], previos).slice(0, 2);

  if (sugerencias.length < 2) throw new Error(`[Archivo: ${FILE_PATH}] No se pudieron generar dos sugerencias diferentes.`);

  const errorOriginal = clean(options.errorOriginal || "");
  return {
    ok: true,
    origen: "fallback-local",
    motor: "local-inteligente",
    archivo: FILE_PATH,
    sugerencias,
    bloqueado: false,
    motivo: "",
    advertencia: errorOriginal ? `Gemini no respondió. Se usó el motor inteligente local. Detalle: ${errorOriginal}` : "Sugerencias generadas con motor inteligente local."
  };
}

export const TaTituloArticuloMotorLocal = Object.freeze({
  generarSugerenciasTitulo,
  detectarArea
});
