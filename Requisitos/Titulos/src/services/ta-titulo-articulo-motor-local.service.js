/*
  Nombre completo: ta-titulo-articulo-motor-local.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js
  Función o funciones:
  - Generar dos sugerencias académicas locales de títulos sin depender de Gemini.
  - Usar carrera, tema, problema, contexto, grupo, período, objetivo y resultado esperado.
  - Separar enfoques: diagnóstico/análisis y propuesta/estrategia.
  - Evitar que el estudiante quede bloqueado si Gemini no responde.
  - Mostrar al estudiante un aviso simple y reservar el detalle técnico para diagnóstico posterior.
  Se conecta con:
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
*/

const FILE_PATH = "Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js";

const AREA_CONFIG = Object.freeze({
  salud: ["enfermer", "salud", "medicina", "laboratorio", "fisioterapia"],
  tecnologia: ["software", "sistema", "informatica", "tecnologia", "electronica", "redes", "ciber"],
  automotriz: ["automotriz", "mecanica", "mantenimiento automotriz", "electricidad automotriz"],
  educacion: ["educacion", "pedagog", "docencia", "desarrollo infantil", "parvularia"],
  gastronomia: ["gastronomia", "alimentos", "cocina", "culinaria"],
  estetica: ["estetica", "belleza", "cosmetologia"]
});

const TEXTOS_AREA = Object.freeze({
  salud: ["Análisis de", "Estrategia de mejora para", "la atención sanitaria"],
  tecnologia: ["Evaluación de", "Diseño de una solución para", "el proceso tecnológico"],
  automotriz: ["Diagnóstico de", "Plan de mejora técnica para", "el sistema automotriz"],
  educacion: ["Análisis de", "Estrategia didáctica para", "el proceso de aprendizaje"],
  gastronomia: ["Evaluación de", "Propuesta de mejora para", "el proceso alimentario"],
  estetica: ["Análisis de", "Protocolo de mejora para", "el procedimiento estético"],
  administracion: ["Diagnóstico de", "Plan de mejora para", "la gestión organizacional"]
});

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizar(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function quitarFinal(value) {
  return clean(value).replace(/[.;,:]+$/g, "").trim();
}

function limpiarFrase(value) {
  return quitarFinal(value)
    .replace(/^(tema|problema|objetivo|resultado|titulo)\s*[:.-]\s*/i, "")
    .replace(/^(analisis|análisis|diagnostico|diagnóstico|evaluacion|evaluación|propuesta|estrategia|plan|diseño|diseno)\s+de\s+/i, "")
    .replace(/^(mejora|fortalecimiento|implementacion|implementación)\s+de\s+/i, "")
    .trim();
}

function frase(value) {
  const texto = limpiarFrase(value);
  return texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : "";
}

function detectarArea(carrera = "") {
  const texto = normalizar(carrera);
  for (const [area, palabras] of Object.entries(AREA_CONFIG)) {
    if (palabras.some((palabra) => texto.includes(palabra))) return area;
  }
  return "administracion";
}

function esGenerico(value) {
  const texto = normalizar(value);
  return !texto || ["tema", "problema", "objetivo", "resultado", "ninguno", "ninguna", "n/a", "na"].includes(texto);
}

function obtenerTema(payload, temaBase) {
  const tema = frase(payload.temaGeneral);
  if (!esGenerico(tema)) return tema;
  const objetivo = frase(payload.objetivoArticulo);
  return esGenerico(objetivo) ? temaBase : objetivo;
}

function obtenerProblema(payload) {
  const problema = frase(payload.problemaNecesidad);
  if (!esGenerico(problema)) return problema;
  const objetivo = frase(payload.objetivoArticulo);
  return esGenerico(objetivo) ? "la problemática identificada" : objetivo;
}

function obtenerResultado(payload, tema) {
  const resultado = frase(payload.resultadoEsperado);
  const base = normalizar(resultado);
  if (!resultado || base.includes("propuesta de mejora relacionada con") || base.includes("propuesta de mejora para")) {
    return `la mejora de ${tema}`;
  }
  return resultado;
}

function construirContexto(payload = {}) {
  const grupo = limpiarFrase(payload.grupoEstudio);
  const lugar = limpiarFrase(payload.lugarContexto);
  const periodo = limpiarFrase(payload.anioPeriodoDatos || payload.anioPeriodo);
  let salida = "en el contexto seleccionado";

  if (grupo && lugar) salida = `en ${grupo} de ${lugar}`;
  else if (grupo) salida = `en ${grupo}`;
  else if (lugar) salida = `en ${lugar}`;
  if (periodo) salida += `, ${periodo}`;
  return salida;
}

function limpiarTitulo(value) {
  const texto = clean(value)
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\ben\s+en\b/gi, "en")
    .replace(/\s+de\s+de\s+/gi, " de ")
    .replace(/[.;]+$/g, "")
    .trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

function contarPalabras(value) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function acortar(value) {
  let titulo = limpiarTitulo(value);
  if (contarPalabras(titulo) <= 30) return titulo;
  titulo = titulo
    .replace(/\s+orientado\s+a\s+la\s+mejora\s+de\s+/i, " para ")
    .replace(/\s+relacionada\s+con\s+/i, " sobre ")
    .replace(/\s+para\s+proponer\s+una\s+mejora\s+alineada\s+con\s+[^,]+/i, "");
  return limpiarTitulo(titulo);
}

function dedupe(titulos = [], previos = []) {
  const usados = new Set(previos.map(normalizar).filter(Boolean));
  const salida = [];
  titulos.forEach((titulo) => {
    const limpio = acortar(titulo);
    const key = normalizar(limpio);
    if (!limpio || usados.has(key) || salida.some((item) => normalizar(item) === key)) return;
    salida.push(limpio);
  });
  return salida;
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
  const [prefijoDiagnostico, prefijoPropuesta, temaBase] = TEXTOS_AREA[area] || TEXTOS_AREA.administracion;
  const tema = obtenerTema(payload, temaBase);
  const problema = obtenerProblema(payload);
  const resultado = obtenerResultado(payload, tema);
  const donde = construirContexto(payload);
  const previos = Array.isArray(payload.titulosYaGenerados) ? payload.titulosYaGenerados : [];

  const sugerencias = dedupe([
    `${prefijoDiagnostico} ${tema} frente a ${problema} ${donde}`,
    `${prefijoPropuesta} ${tema} orientado a ${resultado} ${donde}`,
    `Evaluación de ${tema} ${donde}`,
    `Diseño de una propuesta de mejora frente a ${problema} ${donde}`
  ], previos).slice(0, 2);

  if (sugerencias.length < 2) throw new Error(`[Archivo: ${FILE_PATH}] No se pudieron generar dos sugerencias diferentes.`);

  const errorOriginal = clean(options.errorOriginal || "");
  const aviso = errorOriginal
    ? "No se pudo conectar con Gemini. Se generaron sugerencias con el motor inteligente de respaldo."
    : "Sugerencias generadas con motor inteligente local.";

  return {
    ok: true,
    origen: "fallback-local",
    motor: "local-inteligente",
    archivo: FILE_PATH,
    sugerencias,
    bloqueado: false,
    motivo: "",
    advertencia: aviso,
    detalleTecnico: errorOriginal
  };
}

export const TaTituloArticuloMotorLocal = Object.freeze({
  generarSugerenciasTitulo,
  detectarArea
});
