/*
  Nombre completo: ta-titulo-articulo-collections.js
  Ruta o ubicación: /Requisitos/Titulos/src/firebase/ta-titulo-articulo-collections.js
  Función o funciones:
  - Centralizar los nombres oficiales de colecciones y documentos usados por la app.
  - Alinear el módulo Títulos con las colecciones reales de Firebase.
  - Evitar errores por escribir nombres de colecciones, estados e identificadores en varios archivos.
  - Definir la base mínima de datos que se guardará en la colección titulos.
  Se conecta con:
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-firebase-direct.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/src/coordinador/ta-titulo-articulo-coordinador.app.js
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
*/

export const TA_TITULO_ARTICULO_COLLECTIONS = Object.freeze({
  estudiantes: "Estudiantes",
  periodos: "periodos",
  config: "titulos_config",
  coordinadores: "titulos_coordinadores",
  envios: "titulos",
  historial: "titulos_logs",
  alertas: "titulos_alertas"
});

export const TA_TITULO_ARTICULO_DOCUMENTS = Object.freeze({
  appConfig: "app"
});

export const TA_TITULO_ARTICULO_ESTADOS = Object.freeze({
  sinEnvio: "SIN_ENVIO",
  enviado: "ENVIADO",
  enRevision: "EN_REVISION",
  aprobado: "APROBADO",
  aprobadoConCorrecciones: "APROBADO_CON_CORRECCIONES",
  devuelto: "DEVUELTO"
});

export const TA_TITULO_ARTICULO_ESTADOS_LEGACY = Object.freeze({
  PENDIENTE: TA_TITULO_ARTICULO_ESTADOS.enviado,
  BORRADOR: TA_TITULO_ARTICULO_ESTADOS.sinEnvio
});

export const TA_TITULO_ARTICULO_DECISIONES_COORDINADOR = Object.freeze([
  TA_TITULO_ARTICULO_ESTADOS.aprobado,
  TA_TITULO_ARTICULO_ESTADOS.aprobadoConCorrecciones,
  TA_TITULO_ARTICULO_ESTADOS.devuelto
]);

export const TA_TITULO_ARTICULO_LIMITES = Object.freeze({
  titulosPorEnvio: 3,
  sugerenciasGeminiPorTitulo: 2,
  maxIntentos: 2,
  maxReenviosPorDevolucion: 1
});

export const TA_TITULO_ARTICULO_CAMPOS_TITULO = Object.freeze([
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
]);

export const TA_TITULO_ARTICULO_LOG_TIPOS = Object.freeze({
  envioEstudiante: "ENVIO_ESTUDIANTE",
  reenvioEstudiante: "REENVIO_ESTUDIANTE",
  inicioRevision: "INICIO_REVISION",
  revisionCoordinador: "REVISION_COORDINADOR",
  limpiezaAdmin: "LIMPIEZA_ADMIN"
});

export function limpiarTextoBase(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function limpiarCedula(value) {
  return String(value ?? "").replace(/\D+/g, "").trim();
}

export function normalizarIdSegmento(value) {
  return limpiarTextoBase(value)
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function crearEnvioId(periodoId, cedula) {
  const periodo = normalizarIdSegmento(periodoId);
  const identificacion = limpiarCedula(cedula);
  if (!periodo || !identificacion) return "";
  return `${periodo}__${identificacion}`;
}

export function crearEnvioIdLegacyCedula(cedula) {
  return limpiarCedula(cedula);
}

export function normalizarEstadoTitulo(estado) {
  const value = limpiarTextoBase(estado).toUpperCase();
  return TA_TITULO_ARTICULO_ESTADOS_LEGACY[value] || value || TA_TITULO_ARTICULO_ESTADOS.sinEnvio;
}
