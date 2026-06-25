/*
  Nombre completo: ta-titulo-articulo-collections.js
  Ruta o ubicación: /Requisitos/Titulos/src/firebase/ta-titulo-articulo-collections.js
  Función o funciones:
  - Centralizar los nombres oficiales de colecciones y documentos usados por la app.
  - Evitar errores por escribir nombres de colecciones en varios archivos.
  - Mantener compatibilidad con las colecciones reales de Firebase: Estudiantes y periodos.
  Se conecta con:
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-security.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-estudiante.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-coordinador.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-admin.js
*/

export const TA_TITULO_ARTICULO_COLLECTIONS = Object.freeze({
  estudiantes: "Estudiantes",
  periodos: "periodos",
  config: "ta_titulo_articulo_config",
  coordinadores: "ta_titulo_articulo_coordinadores",
  envios: "ta_titulo_articulo_envios",
  historial: "ta_titulo_articulo_historial",
  alertas: "ta_titulo_articulo_alertas"
});

export const TA_TITULO_ARTICULO_DOCUMENTS = Object.freeze({
  appConfig: "app"
});

export const TA_TITULO_ARTICULO_ESTADOS = Object.freeze({
  borrador: "BORRADOR",
  enviado: "ENVIADO",
  enRevision: "EN_REVISION",
  aprobado: "APROBADO",
  aprobadoConCorrecciones: "APROBADO_CON_CORRECCIONES",
  devuelto: "DEVUELTO"
});

export const TA_TITULO_ARTICULO_DECISIONES_COORDINADOR = Object.freeze([
  TA_TITULO_ARTICULO_ESTADOS.aprobado,
  TA_TITULO_ARTICULO_ESTADOS.aprobadoConCorrecciones,
  TA_TITULO_ARTICULO_ESTADOS.devuelto
]);

export function crearEnvioId(periodoId, cedula) {
  return `${String(periodoId || "").trim()}_${String(cedula || "").trim()}`;
}
