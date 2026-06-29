/*
  Nombre completo: ta-titulo-articulo-motor-local.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js
  Función o funciones:
  - Generar dos sugerencias académicas locales de títulos sin depender de Gemini.
  - Crear una capa previa de normalización académica antes de construir títulos.
  - Convertir frases informales en conceptos académicos mediante un diccionario interno.
  - Separar enfoques: diagnóstico/análisis y propuesta/plan de mejora.
  - Validar títulos finales para evitar frases mal construidas, repeticiones y lenguaje informal.
  - Evitar que el estudiante quede bloqueado si Gemini no responde.
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

const TEMA_BASE_AREA = Object.freeze({
  salud: "la calidad de la atención sanitaria",
  tecnologia: "la mejora del proceso tecnológico",
  automotriz: "la mejora del sistema automotriz",
  educacion: "el fortalecimiento del proceso de aprendizaje",
  gastronomia: "la mejora del proceso alimentario",
  estetica: "la mejora del procedimiento estético",
  administracion: "la mejora de la gestión organizacional"
});

const REGLAS_ACADEMICAS = Object.freeze([
  {
    patrones: ["no saben escribir", "no saben redactar", "escriben mal", "no saben escribir bien"],
    reemplazo: "las dificultades de redacción académica",
    tipos: ["problema"]
  },
  {
    patrones: ["artículos malos", "articulos malos", "sacan artículos malos", "sacan articulos malos", "artículos con errores", "articulos con errores", "muchos errores"],
    reemplazo: "la baja calidad en la elaboración de artículos académicos",
    tipos: ["problema", "tema"]
  },
  {
    patrones: ["mejorar los artículos académicos", "mejorar los articulos academicos", "mejorar artículos académicos", "mejorar articulos academicos"],
    reemplazo: "la calidad de los artículos académicos",
    tipos: ["tema", "objetivo", "resultado"]
  },
  {
    patrones: ["que mejores los estudiantes", "que mejoren los estudiantes", "mejoren los estudiantes", "mejorar estudiantes"],
    reemplazo: "fortalecer las competencias de redacción académica de los estudiantes",
    tipos: ["objetivo", "resultado"]
  },
  {
    patrones: ["no venden", "no vende", "ventas bajas", "bajas ventas", "vende poco", "venden poco"],
    reemplazo: "el bajo nivel de ventas",
    tipos: ["tema", "problema"]
  },
  {
    patrones: ["pocos clientes", "no hay clientes", "baja captación de clientes", "baja captacion de clientes", "faltan clientes"],
    reemplazo: "la baja captación de clientes",
    tipos: ["tema", "problema"]
  },
  {
    patrones: ["mala atención", "mala atencion", "atienden mal", "mal servicio"],
    reemplazo: "las deficiencias en la atención",
    tipos: ["tema", "problema"]
  },
  {
    patrones: ["mejorar ventas", "mejorar las ventas", "subir ventas", "aumentar ventas"],
    reemplazo: "fortalecer el nivel de ventas",
    tipos: ["objetivo", "resultado"]
  },
  {
    patrones: ["mejorar clientes", "conseguir clientes", "atraer clientes", "captar clientes"],
    reemplazo: "fortalecer la captación de clientes",
    tipos: ["objetivo", "resultado"]
  }
]);

const FRASES_PROHIBIDAS = Object.freeze([
  "diagnóstico de mejorar",
  "diagnostico de mejorar",
  "plan de mejora para mejorar",
  "mejora relacionada con mejorar",
  "frente a los estudiantes no saben",
  "sacan artículos malos",
  "sacan articulos malos",
  "no saben escribir bien",
  "orientada a mejora relacionada",
  "para mejorar los artículos académicos para",
  "para mejorar los articulos academicos para",
  "propuesta de mejora relacionada con",
  "orientada a la mejora de propuesta"
]);

const PALABRAS_REPETICION_CONTROLADA = Object.freeze(["mejorar", "mejora", "académicos", "academicos", "artículos", "articulos"]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizar(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function quitarEtiquetas(value) {
  return clean(value)
    .replace(/^(tema|problema|necesidad|objetivo|resultado|titulo|título)\s*[:.-]\s*/i, "")
    .replace(/^(analisis|análisis|diagnostico|diagnóstico|evaluacion|evaluación|propuesta|estrategia|plan|diseño|diseno)\s+(de|para)\s+/i, "")
    .replace(/^(mejora|fortalecimiento|implementacion|implementación)\s+de\s+/i, "")
    .replace(/[.;,:]+$/g, "")
    .trim();
}

function coincidePatron(base, patron) {
  return base.includes(normalizar(patron));
}

function buscarRegla(value, tipo) {
  const base = normalizar(value);
  return REGLAS_ACADEMICAS.find((regla) => regla.tipos.includes(tipo) && regla.patrones.some((patron) => coincidePatron(base, patron)));
}

function academizar(value, tipo = "tema") {
  const texto = quitarEtiquetas(value);
  const regla = buscarRegla(texto, tipo);
  if (regla) return regla.reemplazo;
  return texto;
}

function limpiarFrase(value) {
  return quitarEtiquetas(value);
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

function quitarArticuloInicial(value) {
  return clean(value).replace(/^(la|el|las|los)\s+/i, "").trim();
}

function normalizarTema(temaGeneral, area = "administracion", payload = {}) {
  const tema = academizar(temaGeneral, "tema");
  if (!esGenerico(tema)) return tema;

  const objetivo = academizar(payload.objetivoArticulo, "objetivo");
  if (!esGenerico(objetivo)) return objetivo.replace(/^fortalecer\s+/i, "el fortalecimiento de ");

  return TEMA_BASE_AREA[area] || TEMA_BASE_AREA.administracion;
}

function normalizarProblema(problema, temaAcademico = "") {
  const problemaBase = academizar(problema, "problema");
  if (!esGenerico(problemaBase)) return problemaBase;

  const tema = quitarArticuloInicial(temaAcademico);
  return tema ? `la problemática relacionada con ${tema}` : "la problemática identificada";
}

function construirObjetivoDesdeTema(temaAcademico = "", problemaAcademico = "") {
  const tema = normalizar(temaAcademico);
  const problema = normalizar(problemaAcademico);

  if (tema.includes("calidad de los articulos academicos") || problema.includes("redaccion academica") || problema.includes("articulos academicos")) {
    return "fortalecer la calidad de los artículos académicos elaborados por estudiantes";
  }

  if (tema.includes("captacion de clientes") || problema.includes("captacion de clientes")) {
    return "fortalecer la captación de clientes";
  }

  if (tema.includes("nivel de ventas") || problema.includes("nivel de ventas") || tema.includes("ventas")) {
    return "fortalecer el nivel de ventas";
  }

  if (tema.includes("atencion")) {
    return "mejorar la calidad de la atención";
  }

  const base = quitarArticuloInicial(temaAcademico);
  return base ? `fortalecer ${base}` : "fortalecer la mejora académica propuesta";
}

function transformarObjetivoAnalitico(value) {
  const texto = quitarEtiquetas(value);
  const base = normalizar(texto);
  if (!texto) return "";

  if (base.includes("para proponer")) {
    const fragmento = texto.replace(/^(analizar|evaluar|diagnosticar|identificar)\s+/i, "").replace(/\s+para\s+proponer.*$/i, "").trim();
    if (fragmento) return `fortalecer ${fragmento}`;
  }

  if (/^(analizar|evaluar|diagnosticar|identificar)\s+/i.test(texto)) {
    const fragmento = texto.replace(/^(analizar|evaluar|diagnosticar|identificar)\s+/i, "").trim();
    if (fragmento) return `fortalecer ${fragmento}`;
  }

  if (/^mejorar\s+/i.test(texto)) return texto.replace(/^mejorar\s+/i, "fortalecer ");

  return texto;
}

function completarObjetivoConGrupo(objetivo, grupoAcademico) {
  const objetivoLimpio = clean(objetivo);
  const grupoLimpio = clean(grupoAcademico);
  const objetivoBase = normalizar(objetivoLimpio);
  const grupoBase = normalizar(grupoLimpio);

  if (!objetivoLimpio || !grupoLimpio) return objetivoLimpio;
  if (!objetivoBase.includes("estudiantes")) return objetivoLimpio;
  if (!grupoBase.includes("estudiantes")) return objetivoLimpio;

  const complementoGrupo = grupoLimpio.replace(/^estudiantes\s+/i, "").trim();
  if (!complementoGrupo || normalizar(objetivoLimpio).includes(normalizar(complementoGrupo))) return objetivoLimpio;

  return `${objetivoLimpio} ${complementoGrupo}`;
}

function normalizarObjetivo(objetivo, temaAcademico = "", problemaAcademico = "", grupoAcademico = "") {
  const porRegla = academizar(objetivo, "objetivo");
  let objetivoAcademico = "";

  if (!esGenerico(porRegla) && porRegla !== limpiarFrase(objetivo)) {
    objetivoAcademico = porRegla;
  } else {
    const transformado = transformarObjetivoAnalitico(objetivo);
    const baseTransformada = normalizar(transformado);

    if (
      !transformado ||
      baseTransformada.includes("problema") ||
      baseTransformada.includes("propuesta de mejora relacionada") ||
      baseTransformada.includes("mejora relacionada con") ||
      baseTransformada.includes("mejorar los articulos academicos")
    ) {
      objetivoAcademico = construirObjetivoDesdeTema(temaAcademico, problemaAcademico);
    } else {
      objetivoAcademico = transformado;
    }
  }

  const objetivoBase = normalizar(objetivoAcademico);
  if (objetivoBase.includes("calidad de los articulos academicos")) {
    objetivoAcademico = "fortalecer la calidad de los artículos académicos elaborados por estudiantes";
  } else if (/^la\s+/i.test(objetivoAcademico)) {
    objetivoAcademico = `fortalecer ${objetivoAcademico}`;
  }

  return completarObjetivoConGrupo(objetivoAcademico, grupoAcademico);
}

function normalizarGrupo(value) {
  const texto = limpiarFrase(value);
  const base = normalizar(texto);

  if (!texto) return "";
  if (base.includes("programa de validacion de conocimientos") || /\bpvc\b/.test(base)) {
    return "estudiantes del Programa de Validación de Conocimientos";
  }

  return texto
    .replace(/\bPVC\b/g, "Programa de Validación de Conocimientos")
    .replace(/\s+-\s+/g, " ")
    .trim();
}

function normalizarLugar(value) {
  const texto = limpiarFrase(value);
  const base = normalizar(texto);
  if (base === "itsqmet" || base.includes("instituto superior tecnologico quito metropolitano")) return "ITSQMET";
  return texto;
}

function obtenerPeriodo(payload = {}) {
  return limpiarFrase(payload.anioPeriodoDatos || payload.anioPeriodo);
}

function conectorDe(lugar = "") {
  const texto = clean(lugar);
  const base = normalizar(texto);
  if (!texto) return "";
  if (base.startsWith("el ") || base === "itsqmet") return `del ${texto.replace(/^el\s+/i, "")}`;
  if (base.startsWith("la ")) return `de ${texto}`;
  return `de ${texto}`;
}

function construirContextoEn(grupo = "", lugar = "") {
  const grupoLimpio = clean(grupo);
  const lugarLimpio = clean(lugar);

  if (grupoLimpio && lugarLimpio) return `en ${grupoLimpio} ${conectorDe(lugarLimpio)}`;
  if (grupoLimpio) return `en ${grupoLimpio}`;
  if (lugarLimpio) return `en ${lugarLimpio}`;
  return "en el contexto seleccionado";
}

function construirContextoPropuesta(objetivo = "", grupo = "", lugar = "") {
  const objetivoBase = normalizar(objetivo);
  const grupoBase = normalizar(grupo);

  if (objetivoBase.includes("estudiantes") && grupoBase.includes("estudiantes")) {
    return conectorDe(lugar);
  }

  return construirContextoEn(grupo, lugar);
}

function agregarPeriodo(titulo, periodo) {
  const limpio = clean(titulo).replace(/\s*,\s*$/g, "");
  return periodo ? `${limpio}, ${periodo}` : limpio;
}

function limpiarTitulo(value) {
  const texto = clean(value)
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\ben\s+en\b/gi, "en")
    .replace(/\bde\s+de\b/gi, "de")
    .replace(/\bde\s+el\b/gi, "del")
    .replace(/\s+de\s+del\s+/gi, " del ")
    .replace(/\s{2,}/g, " ")
    .replace(/[.;]+$/g, "")
    .trim();

  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

function contarPalabras(value) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function acortar(value) {
  let titulo = limpiarTitulo(value);
  if (contarPalabras(titulo) <= 32) return titulo;

  titulo = titulo
    .replace(/\s+orientad[oa]\s+a\s+la\s+mejora\s+de\s+/i, " para ")
    .replace(/\s+relacionada\s+con\s+/i, " sobre ")
    .replace(/\s+para\s+proponer\s+una\s+mejora\s+alineada\s+con\s+[^,]+/i, "");

  return limpiarTitulo(titulo);
}

function tieneRepeticionExcesiva(titulo) {
  const texto = normalizar(titulo);
  return PALABRAS_REPETICION_CONTROLADA.some((palabra) => {
    const veces = texto.split(normalizar(palabra)).length - 1;
    return veces >= 3;
  });
}

function contieneFraseProhibida(titulo) {
  const texto = normalizar(titulo);
  return FRASES_PROHIBIDAS.some((fraseProhibida) => texto.includes(normalizar(fraseProhibida)));
}

function tituloAprobado(titulo) {
  const limpio = clean(titulo);
  if (!limpio || contarPalabras(limpio) < 7) return false;
  if (contieneFraseProhibida(limpio)) return false;
  if (tieneRepeticionExcesiva(limpio)) return false;
  return true;
}

function dedupe(titulos = [], previos = []) {
  const usados = new Set(previos.map(normalizar).filter(Boolean));
  const salida = [];

  titulos.forEach((titulo) => {
    const limpio = acortar(titulo);
    const key = normalizar(limpio);
    if (!tituloAprobado(limpio) || usados.has(key) || salida.some((item) => normalizar(item) === key)) return;
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

function construirCandidatos(payload = {}) {
  const area = detectarArea(payload.carrera);
  const temaAcademico = normalizarTema(payload.temaGeneral, area, payload);
  const problemaAcademico = normalizarProblema(payload.problemaNecesidad, temaAcademico);
  const grupoEstudio = normalizarGrupo(payload.grupoEstudio);
  const lugarContexto = normalizarLugar(payload.lugarContexto);
  const anio = obtenerPeriodo(payload);
  const objetivoAcademico = normalizarObjetivo(payload.objetivoArticulo || payload.resultadoEsperado, temaAcademico, problemaAcademico, grupoEstudio);
  const contextoDiagnostico = construirContextoEn(grupoEstudio, lugarContexto);
  const contextoPropuesta = construirContextoPropuesta(objetivoAcademico, grupoEstudio, lugarContexto);

  return [
    agregarPeriodo(`Diagnóstico de ${problemaAcademico} ${contextoDiagnostico}`, anio),
    agregarPeriodo(`Propuesta de mejora para ${objetivoAcademico} ${contextoPropuesta}`, anio),
    agregarPeriodo(`Análisis de ${problemaAcademico} ${contextoDiagnostico}`, anio),
    agregarPeriodo(`Plan de mejora para ${objetivoAcademico} ${contextoPropuesta}`, anio),
    agregarPeriodo(`Evaluación de ${temaAcademico} ${contextoDiagnostico}`, anio),
    agregarPeriodo(`Estrategia de fortalecimiento para ${objetivoAcademico} ${contextoPropuesta}`, anio)
  ];
}

function generarSugerenciasTitulo(payload = {}, options = {}) {
  validar(payload);

  const previos = Array.isArray(payload.titulosYaGenerados) ? payload.titulosYaGenerados : [];
  const sugerencias = dedupe(construirCandidatos(payload), previos).slice(0, 2);

  if (sugerencias.length < 2) throw new Error(`[Archivo: ${FILE_PATH}] No se pudieron generar dos sugerencias académicas aprobadas.`);

  const errorOriginal = clean(options.errorOriginal || "");
  const aviso = errorOriginal
    ? "No se pudo conectar con Gemini. Se generaron sugerencias con el motor académico local."
    : "Sugerencias generadas con motor académico local.";

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
  detectarArea,
  normalizarTema,
  normalizarProblema,
  normalizarObjetivo,
  tituloAprobado,
  tieneRepeticionExcesiva
});
