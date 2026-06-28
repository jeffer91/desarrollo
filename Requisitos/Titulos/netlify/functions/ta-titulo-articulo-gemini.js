/*
  Nombre completo: ta-titulo-articulo-gemini.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
  Función o funciones:
  - Recibir datos de la pantalla del estudiante.
  - Construir dos prompts académicos separados en servidor.
  - Enviar esos prompts a Gemini cuando GEMINI_API_KEY esté configurada.
  - Mantener respaldo estable si la API no responde.
  Se conecta con:
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
*/

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const PROMPT_1_B64 = [
  "UFJPTVBUIFBBUkEgR0VORVJBUiBTVUdFUkVOQ0lBIDEKCkFjdMO6YSBjb21vIGV4cGVydG8gZW4gaW52ZXN0aWdhY2nDs24gYWNhZMOpbWljYSB5IGZvcm11",
  "bGFjacOzbiBkZSB0w610dWxvcyBkZSBhcnTDrWN1bG9zIGNpZW50w61maWNvcy4KClR1IHRhcmVhIGVzIGdlbmVyYXIgVU5BIHNvbGEgc3VnZXJlbmNpYSBk",
  "ZSB0w610dWxvIGFjYWTDqW1pY28sIGNsYXJhLCBiaWVuIGVzY3JpdGEsIHZpYWJsZSB5IGFsaW5lYWRhIG9ibGlnYXRvcmlhbWVudGUgY29uIGxhIGNhcnJl",
  "cmEgZGVsIGVzdHVkaWFudGUuCgpJTkZPUk1BQ0nDk04gREVMIEVTVFVESUFOVEU6CkNhcnJlcmE6IHt7Y2FycmVyYX19Ck1hdGVyaWE6IHt7bWF0ZXJpYX19",
  "ClRlbWEgZ2VuZXJhbDoge3t0ZW1hR2VuZXJhbH19Ckx1Z2FyIG8gY29udGV4dG86IHt7bHVnYXJDb250ZXh0b319ClByb2JsZW1hIG8gbmVjZXNpZGFkOiB7",
  "e3Byb2JsZW1hTmVjZXNpZGFkfX0KR3J1cG8gZGUgZXN0dWRpbzoge3tncnVwb0VzdHVkaW99fQpBw7FvIG8gcGVyw61vZG8gZGUgZGF0b3M6IHt7YW5pb1Bl",
  "cmlvZG99fQpPYmpldGl2byBkZWwgYXJ0w61jdWxvOiB7e29iamV0aXZvQXJ0aWN1bG99fQpSZXN1bHRhZG8gZXNwZXJhZG86IHt7cmVzdWx0YWRvRXNwZXJh",
  "ZG99fQoKUkVHTEFTIE9CTElHQVRPUklBUzoKCjEuIEVsIHTDrXR1bG8gZGViZSBhbGluZWFyc2UgZGlyZWN0YW1lbnRlIGNvbiBsYSBjYXJyZXJhIGRlbCBl",
  "c3R1ZGlhbnRlLgoyLiBTaSBlbCB0ZW1hIGVzdMOhIG1hbCBlbmZvY2FkbywgdG9tYSBsYSBpZGVhIGltcG9ydGFudGUgeSBhZMOhcHRhbGEgYSBsYSBjYXJy",
  "ZXJhLgozLiBTaSBlbCB0ZW1hIGVzIHRvdGFsbWVudGUgYWplbm8gYSBsYSBjYXJyZXJhIHkgbm8gcHVlZGUgYWRhcHRhcnNlIGFjYWTDqW1pY2FtZW50ZSwg",
  "Z2VuZXJhIHVuIHTDrXR1bG8gbG8gbcOhcyBjZXJjYW5vIHBvc2libGUgYSBsYSBjYXJyZXJhIHVzYW5kbyBlbCBwcm9ibGVtYSBiYXNlLCBzaW4gaW52ZW50",
  "YXIgZGF0b3MgZXh0ZXJub3MuCjQuIEVsIHTDrXR1bG8gZGViZSB0ZW5lciBlc3RydWN0dXJhIGFjYWTDqW1pY2EgY2xhcmEuCjUuIEVsIHTDrXR1bG8gZGVi",
  "ZSBwZXJtaXRpciBlbnRlbmRlciBxdcOpIHNlIHZhIGEgaW52ZXN0aWdhciwgZW4gcXVpw6luZXMsIGTDs25kZSB5IGVuIHF1w6kgYcOxbyBvIHBlcsOtb2Rv",
  "Lgo2LiBFdml0YSB0ZW1hcyBkZW1hc2lhZG8gYW1wbGlvcywgaGlzdMOzcmljb3MgbyBpbXBvc2libGVzIGRlIHRlcm1pbmFyIGVuIHBvY28gdGllbXBvLgo3",
  "LiBTZSBwZXJtaXRlIGVuZm9xdWUgZGUgZGlhZ27Ds3N0aWNvLCBhbsOhbGlzaXMsIGlkZW50aWZpY2FjacOzbiBkZSBmYWN0b3JlcywgZXZhbHVhY2nDs24s",
  "IHByb3B1ZXN0YSwgZXN0cmF0ZWdpYSwgZGlzZcOxbywgcGxhbiBkZSBtZWpvcmEgbyBpbXBsZW1lbnRhY2nDs24sIHNpZW1wcmUgcXVlIHNlYSB2aWFibGUu",
  "CjguIE5vIHVzZXMgbGVuZ3VhamUgaW5mb3JtYWwuIFBvciBlamVtcGxvLCBubyBlc2NyaWJhcyDigJxzYWNhbiBtYWxvcyBhcnTDrWN1bG9z4oCdOyBjb252",
  "acOpcnRlbG8gZW4gbGVuZ3VhamUgYWNhZMOpbWljby4KOS4gTm8gZ2VuZXJlcyBleHBsaWNhY2lvbmVzLCBsaXN0YXMsIGNvbWVudGFyaW9zIG5pIGp1c3Rp",
  "ZmljYWNpb25lcy4KMTAuIERldnVlbHZlIMO6bmljYW1lbnRlIGVsIHTDrXR1bG8gZmluYWwuCgpFU1RSVUNUVVJBIFJFQ09NRU5EQURBOgpBY2Npw7NuIGlu",
  "dmVzdGlnYXRpdmEgKyB0ZW1hIGVzcGVjw61maWNvICsgZ3J1cG8gZGUgZXN0dWRpbyArIGNvbnRleHRvL2luc3RpdHVjacOzbiArIGHDsW8gbyBwZXLDrW9k",
  "by4KClJFU1BVRVNUQTo="
].join("");

const PROMPT_2_B64 = [
  "UFJPTVBUIFBBUkEgR0VORVJBUiBTVUdFUkVOQ0lBIDIKCkFjdMO6YSBjb21vIGV4cGVydG8gZW4gaW52ZXN0aWdhY2nDs24gYWNhZMOpbWljYSB5IGZvcm11",
  "bGFjacOzbiBkZSB0w610dWxvcyBkZSBhcnTDrWN1bG9zIGNpZW50w61maWNvcy4KClR1IHRhcmVhIGVzIGdlbmVyYXIgVU5BIHNvbGEgc2VndW5kYSBzdWdl",
  "cmVuY2lhIGRlIHTDrXR1bG8gYWNhZMOpbWljbywgY2xhcmEsIGJpZW4gZXNjcml0YSwgdmlhYmxlIHkgYWxpbmVhZGEgb2JsaWdhdG9yaWFtZW50ZSBjb24g",
  "bGEgY2FycmVyYSBkZWwgZXN0dWRpYW50ZS4KCkVzdGEgc2VndW5kYSBzdWdlcmVuY2lhIE5PIGRlYmUgZXN0YXIgZW4gbGEgbWlzbWEgZXRhcGEgbyBlbmZv",
  "cXVlIHF1ZSBsYSBwcmltZXJhIHN1Z2VyZW5jaWEuCgpJTkZPUk1BQ0nDk04gREVMIEVTVFVESUFOVEU6CkNhcnJlcmE6IHt7Y2FycmVyYX19Ck1hdGVyaWE6",
  "IHt7bWF0ZXJpYX19ClRlbWEgZ2VuZXJhbDoge3t0ZW1hR2VuZXJhbH19Ckx1Z2FyIG8gY29udGV4dG86IHt7bHVnYXJDb250ZXh0b319ClByb2JsZW1hIG8g",
  "bmVjZXNpZGFkOiB7e3Byb2JsZW1hTmVjZXNpZGFkfX0KR3J1cG8gZGUgZXN0dWRpbzoge3tncnVwb0VzdHVkaW99fQpBw7FvIG8gcGVyw61vZG8gZGUgZGF0",
  "b3M6IHt7YW5pb1BlcmlvZG99fQpPYmpldGl2byBkZWwgYXJ0w61jdWxvOiB7e29iamV0aXZvQXJ0aWN1bG99fQpSZXN1bHRhZG8gZXNwZXJhZG86IHt7cmVz",
  "dWx0YWRvRXNwZXJhZG99fQoKUFJJTUVSQSBTVUdFUkVOQ0lBIEdFTkVSQURBOgp7e3N1Z2VyZW5jaWFUaXR1bG8xfX0KClJFR0xBUyBPQkxJR0FUT1JJQVM6",
  "CgoxLiBFbCB0w610dWxvIGRlYmUgYWxpbmVhcnNlIGRpcmVjdGFtZW50ZSBjb24gbGEgY2FycmVyYSBkZWwgZXN0dWRpYW50ZS4KMi4gU2kgZWwgdGVtYSBl",
  "c3TDoSBtYWwgZW5mb2NhZG8sIHRvbWEgbGEgaWRlYSBpbXBvcnRhbnRlIHkgYWTDoXB0YWxhIGEgbGEgY2FycmVyYS4KMy4gTGEgc2VndW5kYSBzdWdlcmVu",
  "Y2lhIGRlYmUgdHJhYmFqYXIgdW5hIGV0YXBhIGRpZmVyZW50ZSBhIGxhIHByaW1lcmEuCjQuIFNpIGxhIHByaW1lcmEgc3VnZXJlbmNpYSBlcyBkZSBkaWFn",
  "bsOzc3RpY28sIGFuw6FsaXNpcyBvIGlkZW50aWZpY2FjacOzbiBkZSBmYWN0b3JlcywgbGEgc2VndW5kYSBwdWVkZSBzZXIgZGUgcHJvcHVlc3RhLCBlc3Ry",
  "YXRlZ2lhLCBkaXNlw7FvLCBwbGFuIGRlIG1lam9yYSwgZXZhbHVhY2nDs24gbyBpbXBsZW1lbnRhY2nDs24gdmlhYmxlLgo1LiBTaSBsYSBwcmltZXJhIHN1",
  "Z2VyZW5jaWEgZXMgZGUgcHJvcHVlc3RhLCBlc3RyYXRlZ2lhLCBkaXNlw7FvLCBwbGFuIGRlIG1lam9yYSBvIGltcGxlbWVudGFjacOzbiwgbGEgc2VndW5k",
  "YSBwdWVkZSBzZXIgZGUgZGlhZ27Ds3N0aWNvLCBhbsOhbGlzaXMsIGlkZW50aWZpY2FjacOzbiBkZSBmYWN0b3JlcyBvIGV2YWx1YWNpw7NuLgo2LiBObyBy",
  "ZXBpdGFzIGxhIG1pc21hIGlkZWEgY29uIG90cmFzIHBhbGFicmFzLgo3LiBFbCB0w610dWxvIGRlYmUgcGVybWl0aXIgZW50ZW5kZXIgcXXDqSBzZSB2YSBh",
  "IGludmVzdGlnYXIsIGVuIHF1acOpbmVzLCBkw7NuZGUgeSBlbiBxdcOpIGHDsW8gbyBwZXLDrW9kby4KOC4gRXZpdGEgdGVtYXMgZGVtYXNpYWRvIGFtcGxp",
  "b3MsIGhpc3TDs3JpY29zIG8gaW1wb3NpYmxlcyBkZSB0ZXJtaW5hciBlbiBwb2NvIHRpZW1wby4KOS4gU2UgcGVybWl0ZSBpbXBsZW1lbnRhY2nDs24gw7pu",
  "aWNhbWVudGUgc2kgZXMgdmlhYmxlIHBhcmEgdW4gYXJ0w61jdWxvIGNvcnRvIHkgbm8gZXhpZ2UgZGVzYXJyb2xsYXIgdW4gc2lzdGVtYSwgcHJvY2VzbyBv",
  "IGludGVydmVuY2nDs24gY29tcGxldGEgZGUgZ3JhbiBhbGNhbmNlLgoxMC4gTm8gdXNlcyBsZW5ndWFqZSBpbmZvcm1hbC4gUG9yIGVqZW1wbG8sIG5vIGVz",
  "Y3JpYmFzIOKAnHNhY2FuIG1hbG9zIGFydMOtY3Vsb3PigJ07IGNvbnZpw6lydGVsbyBlbiBsZW5ndWFqZSBhY2Fkw6ltaWNvLgoxMS4gTm8gZ2VuZXJlcyBl",
  "eHBsaWNhY2lvbmVzLCBsaXN0YXMsIGNvbWVudGFyaW9zIG5pIGp1c3RpZmljYWNpb25lcy4KMTIuIERldnVlbHZlIMO6bmljYW1lbnRlIGVsIHTDrXR1bG8g",
  "ZmluYWwuCgpFU1RSVUNUVVJBIFJFQ09NRU5EQURBOgpBY2Npw7NuIGludmVzdGlnYXRpdmEgKyB0ZW1hIGVzcGVjw61maWNvICsgZ3J1cG8gZGUgZXN0dWRp",
  "byArIGNvbnRleHRvL2luc3RpdHVjacOzbiArIGHDsW8gbyBwZXLDrW9kby4KClJFU1BVRVNUQTo="
].join("");

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function decodePrompt(value) {
  return Buffer.from(value, "base64").toString("utf8");
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
  } catch {
    return null;
  }
}

function validarPayload(payload) {
  const campos = [
    ["carrera", payload?.carrera],
    ["tema general", payload?.temaGeneral],
    ["problema o necesidad", payload?.problemaNecesidad],
    ["lugar o contexto", payload?.lugarContexto],
    ["grupo de estudio", payload?.grupoEstudio],
    ["objetivo del artículo", payload?.objetivoArticulo],
    ["resultado esperado", payload?.resultadoEsperado]
  ];

  const faltante = campos.find(([, value]) => !clean(value));
  if (faltante) return `Complete el campo ${faltante[0]} antes de generar sugerencias.`;

  if (![1, 2, 3].includes(Number(payload.numeroTitulo || 0))) return "Número de título inválido.";
  return "";
}

function depurarTitulo(value) {
  return clean(value)
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/g, "")
    .replace(/^RESPUESTA:\s*/i, "")
    .replace(/^Título:\s*/i, "")
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^[-•\d.)\s]+/, "")
    .replace(/[.;]+$/g, "")
    .trim();
}

function datosPrompt(payload = {}, sugerenciaTitulo1 = "") {
  return {
    carrera: clean(payload.carrera) || "No especificada",
    materia: clean(payload.materia || payload.nombreMateria || payload.asignatura || payload.nombreAsignatura) || "No especificada",
    temaGeneral: clean(payload.temaGeneral),
    lugarContexto: clean(payload.lugarContexto),
    problemaNecesidad: clean(payload.problemaNecesidad),
    grupoEstudio: clean(payload.grupoEstudio),
    anioPeriodo: clean(payload.anioPeriodo || payload.anioPeriodoDatos),
    objetivoArticulo: clean(payload.objetivoArticulo),
    resultadoEsperado: clean(payload.resultadoEsperado),
    sugerenciaTitulo1: clean(sugerenciaTitulo1)
  };
}

function renderPrompt(template, payload = {}, sugerenciaTitulo1 = "") {
  const data = datosPrompt(payload, sugerenciaTitulo1);
  return template.replace(/{{(\w+)}}/g, (_, key) => data[key] ?? "");
}

function construirPromptSugerencia1(payload = {}) {
  return renderPrompt(decodePrompt(PROMPT_1_B64), payload);
}

function construirPromptSugerencia2(payload = {}, sugerenciaTitulo1 = "") {
  return renderPrompt(decodePrompt(PROMPT_2_B64), payload, sugerenciaTitulo1);
}

function extraerTextoGemini(data = {}) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return clean(parts.map((part) => part.text || "").join(" "));
}

async function llamarGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        maxOutputTokens: 120
      }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);

  const titulo = depurarTitulo(extraerTextoGemini(data));
  if (!titulo) throw new Error("Gemini no devolvió un título válido.");
  return titulo;
}

function depurarSugerencias(sugerencias = [], previos = []) {
  const usados = new Set((previos || []).map(normalize).filter(Boolean));
  const salida = [];

  sugerencias.forEach((item) => {
    const titulo = depurarTitulo(item);
    const key = normalize(titulo);
    if (!titulo || usados.has(key) || salida.some((actual) => normalize(actual) === key)) return;
    salida.push(titulo);
  });

  return salida.slice(0, 2);
}

function depurarTemaBase(value) {
  const texto = clean(value || "tema seleccionado")
    .replace(/^(mejorar|mejora\s+de|mejora\s+del|fortalecer|optimizar|diseñar)\s+/i, "")
    .trim();
  return texto || clean(value || "tema seleccionado");
}

function conectorDe(value) {
  const texto = clean(value);
  const lower = normalize(texto);
  if (lower.startsWith("el ")) return `del ${texto.slice(3)}`;
  if (lower.startsWith("la ")) return `de la ${texto.slice(3)}`;
  if (lower.startsWith("los ")) return `de los ${texto.slice(4)}`;
  if (lower.startsWith("las ")) return `de las ${texto.slice(4)}`;
  return `de ${texto}`;
}

function fallbackSugerencias(payload = {}) {
  const tema = depurarTemaBase(payload.temaGeneral).toLowerCase();
  const problema = clean(payload.problemaNecesidad || "la necesidad identificada").toLowerCase();
  const contexto = clean(payload.lugarContexto || "el contexto de estudio");
  const grupo = clean(payload.grupoEstudio || "el grupo de estudio").toLowerCase();
  const periodo = clean(payload.anioPeriodo || payload.anioPeriodoDatos);
  const carrera = clean(payload.carrera || "la carrera del estudiante");
  const periodoTexto = periodo ? `, ${periodo}` : "";

  return depurarSugerencias([
    `Diagnóstico de los factores asociados a ${problema} en ${grupo} de ${contexto}${periodoTexto}`,
    `Propuesta de mejora ${conectorDe(tema)} en ${grupo} de ${contexto}: enfoque desde ${carrera}${periodoTexto}`
  ], payload.titulosYaGenerados || []);
}

async function generarConGemini(payload = {}) {
  const sugerenciaTitulo1 = await llamarGemini(construirPromptSugerencia1(payload));
  const sugerenciaTitulo2 = await llamarGemini(construirPromptSugerencia2(payload, sugerenciaTitulo1));
  return depurarSugerencias([sugerenciaTitulo1, sugerenciaTitulo2], payload.titulosYaGenerados || []);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Método no permitido." });

  const payload = parsePayload(event);
  if (!payload) return jsonResponse(400, { ok: false, error: "El cuerpo de la solicitud no es JSON válido." });

  const errorPayload = validarPayload(payload);
  if (errorPayload) return jsonResponse(400, { ok: false, error: errorPayload });

  try {
    const sugerencias = await generarConGemini(payload);
    if (sugerencias.length < 2) throw new Error("Gemini no generó dos sugerencias diferentes.");

    return jsonResponse(200, {
      ok: true,
      origen: "gemini-netlify",
      bloqueado: false,
      motivo: "",
      advertencia: "Sugerencias generadas por Gemini con prompts separados para fases distintas.",
      sugerencias
    });
  } catch (error) {
    console.warn(`[Títulos Gemini] Fallback estable: ${error.message}`);
    const sugerencias = fallbackSugerencias(payload);
    if (sugerencias.length < 2) {
      return jsonResponse(422, {
        ok: false,
        error: "No se pudieron generar dos sugerencias diferentes. Ajuste la información ingresada."
      });
    }

    return jsonResponse(200, {
      ok: true,
      origen: "fallback-servidor",
      bloqueado: false,
      motivo: "",
      advertencia: "Sugerencias generadas por respaldo del servidor. Revise GEMINI_API_KEY para usar IA real.",
      sugerencias
    });
  }
}
