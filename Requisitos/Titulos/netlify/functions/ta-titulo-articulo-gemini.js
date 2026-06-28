/*
  Nombre completo: ta-titulo-articulo-gemini.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
  Función o funciones:
  - Conectar de forma segura la pantalla del estudiante con Gemini desde Netlify Functions.
  - Proteger la variable de entorno GEMINI_API_KEY para que no quede expuesta en el navegador.
  - Generar 2 sugerencias de título por etapa, siempre alineadas a la carrera del estudiante.
  - Bloquear o advertir cuando el tema sea ajeno a la carrera.
  - Responder JSON limpio para la pantalla estudiante.
  Se conecta con:
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
*/

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = "gemini-3.5-flash";

const AREA_KEYWORDS = Object.freeze({
  salud: {
    carreras: ["ENFERMERIA", "SALUD", "MEDICINA", "LABORATORIO", "FISIOTERAPIA", "REHABILITACION FISICA", "REHABILITACIÓN FÍSICA"],
    positivos: ["paciente", "salud", "cuidado", "enfermer", "clinico", "clínico", "hospital", "bioseguridad", "rehabilitacion", "rehabilitación", "fisioterapia", "terapia", "prevencion", "prevención"],
    bloqueos: ["ventas", "inventario", "rentabilidad", "publicidad", "software", "redes", "receta", "menu", "menú"]
  },
  administracion: {
    carreras: ["ADMINISTRACION", "ADMINISTRACIÓN", "TALENTO HUMANO", "GESTION", "GESTIÓN", "EMPRESAS", "CONTABILIDAD", "FINANZAS", "MARKETING", "VENTAS", "LOGISTICA", "LOGÍSTICA"],
    positivos: ["empresa", "gestion", "gestión", "administracion", "administración", "procesos", "cliente", "ventas", "marketing", "talento humano", "clima laboral", "productividad", "inventario", "costos", "finanzas", "contable"],
    bloqueos: ["paciente", "hospital", "enfermer", "vacunacion", "vacunación", "programacion", "programación", "software", "receta", "tratamiento facial"]
  },
  tecnologia: {
    carreras: ["SOFTWARE", "SISTEMAS", "INFORMATICA", "INFORMÁTICA", "TECNOLOGIA", "TECNOLOGÍA", "REDES", "CIBERSEGURIDAD", "ELECTRONICA", "ELECTRÓNICA", "TELECOMUNICACIONES", "PROGRAMACION", "PROGRAMACIÓN"],
    positivos: ["sistema", "software", "aplicacion", "aplicación", "app", "plataforma", "base de datos", "automatizacion", "automatización", "seguridad informatica", "seguridad informática", "redes", "digital", "algoritmo", "prototipo"],
    bloqueos: ["paciente", "enfermer", "hospital", "receta", "menu", "menú", "maquillaje", "tratamiento facial"]
  },
  educacion: {
    carreras: ["EDUCACION", "EDUCACIÓN", "PEDAGOGIA", "PEDAGOGÍA", "DOCENCIA", "DESARROLLO INFANTIL", "PARVULARIA"],
    positivos: ["estudiantes", "docentes", "aprendizaje", "ensenanza", "enseñanza", "aula", "educacion", "educación", "didactica", "didáctica", "rendimiento academico", "rendimiento académico", "metodologia", "metodología", "capacitacion", "capacitación", "evaluacion", "evaluación"],
    bloqueos: ["paciente", "hospital", "inventario", "ventas", "software", "receta", "tratamiento facial"]
  },
  gastronomia: {
    carreras: ["GASTRONOMIA", "GASTRONOMÍA", "ALIMENTOS", "COCINA", "CULINARIA", "PROCESAMIENTO DE ALIMENTOS"],
    positivos: ["alimentos", "inocuidad", "cocina", "receta", "menu", "menú", "restaurante", "gastronomia", "gastronomía", "conservacion", "conservación", "manipulacion", "manipulación", "calidad alimentaria"],
    bloqueos: ["paciente", "hospital", "software", "redes", "ventas", "maquillaje", "tratamiento facial"]
  },
  estetica: {
    carreras: ["ESTETICA", "ESTÉTICA", "BELLEZA", "COSMETOLOGIA", "COSMETOLOGÍA", "TERAPIAS INTEGRALES ESTETICAS", "TERAPIAS INTEGRALES ESTÉTICAS"],
    positivos: ["estetica", "estética", "piel", "tratamiento facial", "tratamiento corporal", "cosmetologia", "cosmetología", "cabina", "bienestar", "masaje", "terapia estetica", "terapia estética", "protocolo estetico", "protocolo estético"],
    bloqueos: ["software", "redes", "inventario", "receta", "hospital", "paciente", "ventas"]
  },
  automotriz: {
    carreras: ["MECANICA AUTOMOTRIZ", "MECÁNICA AUTOMOTRIZ", "AUTOMOTRIZ", "MANTENIMIENTO VEHICULAR", "ELECTROMECANICA AUTOMOTRIZ", "ELECTROMECÁNICA AUTOMOTRIZ"],
    positivos: ["vehiculo", "vehículo", "vehicular", "automotriz", "mecanica", "mecánica", "motor", "motores", "taller", "diagnostico", "diagnóstico", "obd", "mantenimiento", "frenos", "suspension", "suspensión", "diesel", "diésel", "gasolina"],
    bloqueos: ["paciente", "hospital", "enfermer", "receta", "maquillaje", "tratamiento facial", "clima laboral"]
  }
});

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function parsePayload(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch (error) {
    return null;
  }
}

function detectarArea(carrera = "") {
  const texto = normalize(carrera);
  for (const [id, area] of Object.entries(AREA_KEYWORDS)) {
    if (area.carreras.some((palabra) => texto.includes(normalize(palabra)))) {
      return { id, ...area };
    }
  }
  return null;
}

function contiene(texto, palabras = []) {
  const base = normalize(texto);
  return palabras.some((palabra) => base.includes(normalize(palabra)));
}

function evaluarCoherenciaBasica(payload) {
  const carrera = clean(payload.carrera);
  const area = detectarArea(carrera);
  const texto = [
    payload.temaGeneral,
    payload.problemaNecesidad,
    payload.lugarContexto,
    payload.grupoEstudio,
    payload.anioPeriodoDatos,
    payload.objetivoArticulo,
    payload.resultadoEsperado,
    payload.tituloManual
  ].map(clean).join(" ");

  if (!area) {
    return {
      bloqueado: false,
      advertencia: "No se reconoció automáticamente el área de la carrera. Gemini debe validar la coherencia con la carrera escrita.",
      motivo: ""
    };
  }

  const tieneAnclaje = contiene(texto, area.positivos);
  const bloqueoFuerte = contiene(texto, area.bloqueos);

  if (bloqueoFuerte && !tieneAnclaje) {
    return {
      bloqueado: true,
      advertencia: "",
      motivo: `La información ingresada parece pertenecer a otra área y no a la carrera ${carrera}. Reformule el tema hacia su carrera.`
    };
  }

  return {
    bloqueado: false,
    advertencia: tieneAnclaje ? "" : `Revise que el tema tenga relación directa con la carrera ${carrera}.`,
    motivo: ""
  };
}

function validarPayload(payload) {
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
  if (faltante) return `Complete el campo ${faltante[0]} antes de generar sugerencias.`;

  const numero = Number(payload.numeroTitulo || 0);
  if (![1, 2, 3].includes(numero)) return "Número de título inválido.";
  return "";
}

function construirPrompt(payload, coherencia) {
  const titulosPrevios = Array.isArray(payload.titulosYaGenerados)
    ? payload.titulosYaGenerados.map(clean).filter(Boolean)
    : [];

  return `
Actúa como asesor académico de titulación de un instituto superior.
Tu tarea es generar exactamente 2 opciones de título para un artículo académico técnico.

REGLAS OBLIGATORIAS:
1. El título debe estar claramente alineado a la carrera del estudiante.
2. Si el tema es ajeno a la carrera, responde bloqueado=true y no inventes títulos.
3. No generes títulos repetidos ni demasiado parecidos a títulos previos.
4. No desarrolles introducción, objetivos, metodología, índice ni explicación larga.
5. Usa lenguaje académico claro, específico y viable.
6. Evita títulos demasiado amplios.
7. Devuelve únicamente JSON válido, sin markdown.

FORMATO OBLIGATORIO DE RESPUESTA:
{
  "bloqueado": false,
  "motivo": "",
  "advertencia": "",
  "sugerencias": ["Título sugerido 1", "Título sugerido 2"]
}

DATOS DEL ESTUDIANTE:
Carrera: ${clean(payload.carrera)}
Código de carrera: ${clean(payload.codigoCarrera)}
Número de título en proceso: ${Number(payload.numeroTitulo)} de 3

DATOS DE LA PROPUESTA:
Tema general: ${clean(payload.temaGeneral)}
Problema o necesidad: ${clean(payload.problemaNecesidad)}
Lugar o contexto: ${clean(payload.lugarContexto)}
Grupo de estudio: ${clean(payload.grupoEstudio)}
Año o período de datos: ${clean(payload.anioPeriodoDatos)}
Objetivo del artículo: ${clean(payload.objetivoArticulo)}
Resultado esperado: ${clean(payload.resultadoEsperado)}
Título escrito por el estudiante, si existe: ${clean(payload.tituloManual) || "No escribió título manual."}

TÍTULOS YA GENERADOS O GUARDADOS:
${titulosPrevios.length ? titulosPrevios.map((titulo, index) => `${index + 1}. ${titulo}`).join("\n") : "No hay títulos previos."}

VALIDACIÓN LOCAL PREVIA:
Bloqueado localmente: ${coherencia.bloqueado ? "sí" : "no"}
Advertencia local: ${clean(coherencia.advertencia) || "sin advertencia"}
Motivo local: ${clean(coherencia.motivo) || "sin motivo"}
`.trim();
}

function extraerTextoGemini(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.output_text === "string") return data.output_text;

  const textos = [];
  const steps = Array.isArray(data.steps) ? data.steps : [];
  for (const step of steps) {
    const content = Array.isArray(step.content) ? step.content : [];
    for (const item of content) {
      if (typeof item.text === "string") textos.push(item.text);
      if (typeof item.output_text === "string") textos.push(item.output_text);
    }
  }
  return textos.join("\n").trim();
}

function extraerJson(texto) {
  const limpio = clean(texto).replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(limpio);
  } catch (error) {
    const start = limpio.indexOf("{");
    const end = limpio.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(limpio.slice(start, end + 1));
    }
    throw error;
  }
}

function limpiarTitulo(value) {
  let texto = clean(value).replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  while (texto.length > 1 && ((texto.startsWith('"') && texto.endsWith('"')) || (texto.startsWith("'") && texto.endsWith("'")))) {
    texto = texto.slice(1, -1).trim();
  }
  return texto;
}

function depurarSugerencias(sugerencias = [], previos = []) {
  const usados = new Set((previos || []).map(normalize).filter(Boolean));
  const salida = [];

  for (const item of sugerencias) {
    const titulo = limpiarTitulo(item);
    const key = normalize(titulo);
    if (!titulo || usados.has(key) || salida.some((existente) => normalize(existente) === key)) continue;
    salida.push(titulo);
    if (salida.length === 2) break;
  }

  return salida;
}

async function llamarGemini(prompt) {
  const apiKey = clean(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en Netlify.");
  }

  const model = clean(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model,
      system_instruction: "Responde únicamente JSON válido. No uses markdown.",
      input: prompt,
      generation_config: {
        temperature: 0.35,
        thinking_level: "low"
      }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini respondió HTTP ${response.status}`);
  }

  const texto = extraerTextoGemini(data);
  if (!texto) throw new Error("Gemini no devolvió texto utilizable.");
  return extraerJson(texto);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Método no permitido." });
  }

  const payload = parsePayload(event);
  if (!payload) {
    return jsonResponse(400, { ok: false, error: "El cuerpo de la solicitud no es JSON válido." });
  }

  const errorPayload = validarPayload(payload);
  if (errorPayload) {
    return jsonResponse(400, { ok: false, error: errorPayload });
  }

  const coherencia = evaluarCoherenciaBasica(payload);
  if (coherencia.bloqueado) {
    return jsonResponse(200, {
      ok: true,
      bloqueado: true,
      motivo: coherencia.motivo,
      advertencia: "",
      sugerencias: []
    });
  }

  try {
    const respuesta = await llamarGemini(construirPrompt(payload, coherencia));
    const sugerencias = depurarSugerencias(respuesta.sugerencias, payload.titulosYaGenerados);

    if (respuesta.bloqueado) {
      return jsonResponse(200, {
        ok: true,
        bloqueado: true,
        motivo: clean(respuesta.motivo || "Gemini detectó que el tema no corresponde a la carrera."),
        advertencia: "",
        sugerencias: []
      });
    }

    if (sugerencias.length < 2) {
      return jsonResponse(502, {
        ok: false,
        error: "Gemini no devolvió dos títulos válidos y diferentes. Intente ajustar la información."
      });
    }

    return jsonResponse(200, {
      ok: true,
      bloqueado: false,
      motivo: "",
      advertencia: clean(respuesta.advertencia || coherencia.advertencia),
      sugerencias
    });
  } catch (error) {
    console.error("[ta-titulo-articulo-gemini]", error);
    return jsonResponse(500, {
      ok: false,
      error: error.message || "No se pudieron generar sugerencias con Gemini."
    });
  }
}
