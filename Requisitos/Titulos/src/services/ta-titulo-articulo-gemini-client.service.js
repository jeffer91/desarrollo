/*
  Nombre completo: ta-titulo-articulo-gemini-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  Función o funciones:
  - Mantener el mismo nombre público del servicio para no romper la pantalla del estudiante.
  - Generar sugerencias con el motor académico local interno.
  - Evitar que la pantalla dependa de servicios externos para crear títulos.
  - Devolver 3 sugerencias por momento investigativo: inicio, proceso y resultados.
  Se conecta con:
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js
*/

import { TaTituloArticuloMotorLocal } from "./ta-titulo-articulo-motor-local.service.js";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function buildBody(payload = {}) {
  return {
    carrera: clean(payload.carrera),
    materia: clean(payload.materia || payload.nombreMateria || payload.asignatura || payload.nombreAsignatura),
    codigoCarrera: clean(payload.codigoCarrera),
    temaGeneral: clean(payload.temaGeneral),
    problemaNecesidad: clean(payload.problemaNecesidad),
    lugarContexto: clean(payload.lugarContexto),
    grupoEstudio: clean(payload.grupoEstudio),
    anioPeriodoDatos: clean(payload.anioPeriodoDatos || payload.anioPeriodo),
    objetivoArticulo: clean(payload.objetivoArticulo),
    resultadoEsperado: clean(payload.resultadoEsperado),
    tituloManual: clean(payload.tituloManual),
    numeroTitulo: Number(payload.numeroTitulo || 0),
    titulosYaGenerados: Array.isArray(payload.titulosYaGenerados) ? payload.titulosYaGenerados.map(clean).filter(Boolean) : []
  };
}

async function generarSugerenciasTitulo(payload = {}) {
  return TaTituloArticuloMotorLocal.generarSugerenciasTitulo(buildBody(payload));
}

export const TaTituloArticuloGemini = Object.freeze({
  generarSugerenciasTitulo
});
