/*
  Nombre completo: ta-titulo-articulo-estudiante.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  Función o funciones:
  - Controlar la pantalla pública del estudiante.
  - Consultar estudiante por cédula.
  - Mostrar datos básicos del estudiante y estado del envío.
  - Validar 3 propuestas de título solo cuando el estudiante presiona validar o enviar.
  - Generar título y resultado esperado de apoyo cuando estén vacíos.
  - Enviar propuestas a revisión mediante Netlify Functions.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-coherencia.service.js
*/

import { TaTituloArticuloApi } from "../services/ta-titulo-articulo-api-client.service.js";
import {
  COHERENCIA_ESTADOS,
  construirTitulo,
  resumirCorreccion,
  validarCoherenciaPropuesta
} from "../services/ta-titulo-articulo-coherencia.service.js";

const state = {
  cedula: "",
  estudiante: null,
  periodoActivo: null,
  envio: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const onlyDigits = (value) => String(value ?? "").replace(/\D+/g, "").trim();

function byId(id) {
  return document.getElementById(id);
}

function show(id, visible) {
  const element = byId(id);
  if (element) element.hidden = !visible;
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = clean(value) || "---";
}

function field(name) {
  return $(`[name="${name}"]`);
}

function val(name) {
  return clean(field(name)?.value);
}

function setVal(name, value) {
  const element = field(name);
  if (element) element.value = clean(value);
}

function msg(text, type = "") {
  const element = byId("ta-estudiante-busqueda-mensaje");
  if (!element) return;
  element.textContent = clean(text);
  element.classList.remove("ta-message--error", "ta-message--ok", "ta-message--warning");
  if (type) element.classList.add(`ta-message--${type}`);
  element.hidden = !text;
}

function names(number) {
  return {
    temaGeneral: `propuesta${number}Tema`,
    lugarContexto: `propuesta${number}Lugar`,
    problemaNecesidad: `propuesta${number}Problema`,
    grupoEstudio: `propuesta${number}Grupo`,
    anioPeriodoDatos: `propuesta${number}Tiempo`,
    objetivoArticulo: `propuesta${number}Objetivo`,
    resultadoEsperado: `propuesta${number}Resultado`,
    tituloFinal: `propuesta${number}Titulo`
  };
}

function proposalCard(number) {
  return $(`[data-ta-propuesta="${number}"]`);
}

function carreraEstudiante() {
  return clean(state.estudiante?.carrera || state.estudiante?.nombreCarrera || state.estudiante?.NombreCarrera || "");
}

function generarResultadoEsperado(propuesta) {
  const tema = clean(propuesta.temaGeneral || "tema planteado").toLowerCase();
  const grupo = clean(propuesta.grupoEstudio || "grupo de estudio").toLowerCase();
  return `Propuesta de mejora relacionada con ${tema} para ${grupo}.`;
}

function leerPropuesta(number) {
  const map = names(number);
  const propuesta = {
    numero: number,
    temaGeneral: val(map.temaGeneral),
    lugarContexto: val(map.lugarContexto),
    problemaNecesidad: val(map.problemaNecesidad),
    grupoEstudio: val(map.grupoEstudio),
    anioPeriodoDatos: val(map.anioPeriodoDatos),
    objetivoArticulo: val(map.objetivoArticulo),
    resultadoEsperado: val(map.resultadoEsperado),
    tituloFinal: val(map.tituloFinal),
    carrera: carreraEstudiante()
  };

  if (!propuesta.resultadoEsperado && propuesta.temaGeneral && propuesta.grupoEstudio) {
    propuesta.resultadoEsperado = generarResultadoEsperado(propuesta);
    setVal(map.resultadoEsperado, propuesta.resultadoEsperado);
  }

  if (!propuesta.tituloFinal && propuesta.temaGeneral && propuesta.problemaNecesidad && propuesta.lugarContexto && propuesta.grupoEstudio) {
    propuesta.tituloFinal = construirTitulo(propuesta, propuesta.carrera);
    setVal(map.tituloFinal, propuesta.tituloFinal);
  }

  const card = proposalCard(number);
  if (card?.dataset.coherenciaAceptada === "true") {
    propuesta.coherencia = { aceptadaEnCliente: true };
  }

  return propuesta;
}

function escribirPropuesta(number, propuesta = {}, marcarAceptada = false) {
  const map = names(number);
  setVal(map.temaGeneral, propuesta.temaGeneral);
  setVal(map.lugarContexto, propuesta.lugarContexto);
  setVal(map.problemaNecesidad, propuesta.problemaNecesidad);
  setVal(map.grupoEstudio, propuesta.grupoEstudio);
  setVal(map.anioPeriodoDatos, propuesta.anioPeriodoDatos);
  setVal(map.objetivoArticulo, propuesta.objetivoArticulo);
  setVal(map.resultadoEsperado, propuesta.resultadoEsperado);
  setVal(map.tituloFinal, propuesta.tituloFinal);

  const card = proposalCard(number);
  if (card) card.dataset.coherenciaAceptada = marcarAceptada ? "true" : "false";
}

function limpiarPanelCoherencia(number) {
  proposalCard(number)?.querySelector(".ta-coherencia-card")?.remove();
}

function crearFilaCorreccion(label, value) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>${label}:</strong> ${clean(value)}`;
  return li;
}

function mostrarPanelCoherencia(number, resultado) {
  const card = proposalCard(number);
  if (!card) return;

  limpiarPanelCoherencia(number);

  const panel = document.createElement("div");
  panel.className = "ta-coherencia-card";

  if (resultado.estado === COHERENCIA_ESTADOS.valida) {
    panel.classList.add("ta-coherencia-card--ok");
    panel.innerHTML = `<strong>Propuesta ${number} validada.</strong><p>La propuesta mantiene relación con la carrera del estudiante.</p>`;
    card.appendChild(panel);
    return;
  }

  if (resultado.estado === COHERENCIA_ESTADOS.bloqueada) {
    panel.classList.add("ta-coherencia-card--error");
    panel.innerHTML = `<strong>Propuesta ${number} bloqueada.</strong><p>${clean(resultado.mensaje)}</p>`;
    card.appendChild(panel);
    return;
  }

  if (resultado.estado === COHERENCIA_ESTADOS.adaptable && resultado.propuestaCorregida) {
    panel.classList.add("ta-coherencia-card--warning");
    const title = document.createElement("strong");
    title.textContent = `Propuesta ${number} corregida hacia la carrera.`;
    const help = document.createElement("p");
    help.textContent = "Debe aceptar esta versión corregida para poder enviar.";
    const ul = document.createElement("ul");

    resumirCorreccion(resultado.propuestaCorregida).forEach(([label, value]) => {
      ul.appendChild(crearFilaCorreccion(label, value));
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ta-button ta-button--primary";
    button.textContent = "Aceptar versión corregida";
    button.addEventListener("click", () => {
      escribirPropuesta(number, resultado.propuestaCorregida, true);
      mostrarPanelCoherencia(number, {
        estado: COHERENCIA_ESTADOS.valida
      });
      msg(`Propuesta ${number} corregida y aceptada.`, "ok");
    });

    panel.append(title, help, ul, button);
    card.appendChild(panel);
  }
}

function validarCamposBasicos(propuesta, number) {
  const obligatorios = [
    ["Tema general", propuesta.temaGeneral],
    ["Lugar o contexto", propuesta.lugarContexto],
    ["Problema o necesidad", propuesta.problemaNecesidad],
    ["Grupo de estudio", propuesta.grupoEstudio],
    ["Año o período de datos", propuesta.anioPeriodoDatos],
    ["Objetivo del artículo", propuesta.objetivoArticulo],
    ["Resultado esperado", propuesta.resultadoEsperado],
    ["Título final", propuesta.tituloFinal]
  ];

  const faltante = obligatorios.find(([, value]) => !clean(value));
  if (faltante) {
    msg(`La propuesta ${number} tiene incompleto: ${faltante[0]}.`, "error");
    return false;
  }
  return true;
}

function validarPropuestas({ mostrar = true } = {}) {
  if (!state.estudiante) {
    msg("Primero consulte su cédula.", "error");
    return { ok: false, propuestas: [] };
  }

  let ok = true;
  const propuestas = [];

  for (let number = 1; number <= 3; number += 1) {
    const propuesta = leerPropuesta(number);
    propuestas.push(propuesta);
    limpiarPanelCoherencia(number);

    if (!validarCamposBasicos(propuesta, number)) {
      ok = false;
      continue;
    }

    const resultado = validarCoherenciaPropuesta(propuesta, carreraEstudiante(), { forzar: true });
    if (mostrar) mostrarPanelCoherencia(number, resultado);

    if (!resultado.ok) ok = false;
  }

  const titulos = propuestas.map((p) => clean(p.tituloFinal).toLowerCase()).filter(Boolean);
  if (titulos.length === 3 && new Set(titulos).size !== 3) {
    msg("Los 3 títulos deben ser diferentes.", "error");
    ok = false;
  }

  if (ok) {
    msg("Las 3 propuestas están listas para enviar.", "ok");
  }

  return { ok, propuestas };
}

function obtenerTituloPreferido() {
  return Number($('[name="tituloPreferido"]:checked')?.value || 0);
}

function renderDatos() {
  const estudiante = state.estudiante || {};
  setText("ta-estudiante-dato-nombres", estudiante.nombres || estudiante.Nombres || estudiante.nombre);
  setText("ta-estudiante-dato-cedula", estudiante.cedula || estudiante.numeroIdentificacion || state.cedula);
  setText("ta-estudiante-dato-carrera", estudiante.carrera || estudiante.nombreCarrera || estudiante.NombreCarrera);
  setText("ta-estudiante-dato-periodo", state.periodoActivo?.label || estudiante.periodoLabel || estudiante.periodoId);
}

function estadoLabel(estado) {
  const value = clean(estado || "SIN_ENVIO");
  const labels = {
    SIN_ENVIO: "Sin envío registrado",
    BORRADOR: "Borrador",
    ENVIADO: "Enviado para revisión",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    APROBADO_CON_CORRECCIONES: "Aprobado con correcciones",
    DEVUELTO: "Devuelto para corregir"
  };
  return labels[value] || value;
}

function renderEstado() {
  const box = byId("ta-estudiante-estado-contenido");
  if (!box) return;

  const envio = state.envio;
  if (!envio) {
    box.className = "ta-empty-state";
    box.textContent = "Sin revisión registrada.";
    return;
  }

  const tituloFinal = clean(envio.tituloCorregido || envio.tituloElegidoTexto || "");
  box.className = "ta-state-box";
  box.innerHTML = `
    <p><strong>Estado:</strong> ${estadoLabel(envio.estado)}</p>
    ${tituloFinal ? `<p><strong>Título seleccionado:</strong> ${tituloFinal}</p>` : ""}
    ${clean(envio.observacion) ? `<p><strong>Observación:</strong> ${clean(envio.observacion)}</p>` : ""}
    ${clean(envio.enviadoEn) ? `<p><strong>Fecha de envío:</strong> ${clean(envio.enviadoEn)}</p>` : ""}
  `;
}

function restaurarEnvio(envio) {
  if (!envio) return;

  if (envio.telegramUser) byId("ta-estudiante-telegram-user").value = clean(envio.telegramUser);
  if (envio.tituloPreferidoNumero) {
    const radio = $(`[name="tituloPreferido"][value="${Number(envio.tituloPreferidoNumero)}"]`);
    if (radio) radio.checked = true;
  }

  if (Array.isArray(envio.propuestas)) {
    envio.propuestas.forEach((propuesta, index) => escribirPropuesta(Number(propuesta.numero || index + 1), propuesta, true));
  }
}

async function buscarEstudiante(event) {
  event?.preventDefault();
  const cedula = onlyDigits(byId("ta-estudiante-cedula")?.value);

  if (!cedula) {
    msg("Ingrese una cédula válida.", "error");
    return;
  }

  try {
    msg("Consultando estudiante...", "warning");
    const data = await TaTituloArticuloApi.estudiante.buscarPorCedula(cedula);

    state.cedula = cedula;
    state.estudiante = data.estudiante || null;
    state.periodoActivo = data.periodoActivo || null;
    state.envio = data.envio || null;

    if (!state.estudiante) {
      throw new Error("No se encontró el estudiante.");
    }

    renderDatos();
    restaurarEnvio(state.envio);
    renderEstado();

    show("ta-estudiante-datos-card", true);
    show("ta-estudiante-telegram-card", true);
    show("ta-estudiante-propuestas-card", true);
    show("ta-estudiante-estado-card", true);
    msg("Estudiante encontrado. Puede completar sus propuestas.", "ok");
  } catch (error) {
    console.error("[Títulos estudiante]", error);
    msg(error.message || "No se pudo consultar la cédula.", "error");
    show("ta-estudiante-datos-card", false);
    show("ta-estudiante-telegram-card", false);
    show("ta-estudiante-propuestas-card", false);
    show("ta-estudiante-estado-card", false);
  }
}

async function enviarPropuestas() {
  if (!state.estudiante || !state.periodoActivo) {
    msg("Primero consulte su cédula.", "error");
    return;
  }

  const telegramUser = clean(byId("ta-estudiante-telegram-user")?.value);
  if (!telegramUser) {
    msg("Ingrese su usuario de Telegram.", "error");
    return;
  }

  const tituloPreferidoNumero = obtenerTituloPreferido();
  if (![1, 2, 3].includes(tituloPreferidoNumero)) {
    msg("Seleccione cuál de los 3 títulos prefiere.", "error");
    return;
  }

  const validacion = validarPropuestas({ mostrar: true });
  if (!validacion.ok) {
    msg("Revise las correcciones marcadas antes de enviar.", "error");
    return;
  }

  try {
    msg("Enviando propuestas...", "warning");
    const data = await TaTituloArticuloApi.estudiante.enviarPropuestas({
      cedula: state.cedula,
      telegramUser,
      tituloPreferidoNumero,
      propuestas: validacion.propuestas
    });

    state.envio = data.envio || null;
    renderEstado();
    show("ta-estudiante-estado-card", true);
    msg(data.mensaje || "Propuestas enviadas correctamente.", "ok");
  } catch (error) {
    console.error("[Títulos estudiante envío]", error);
    msg(error.message || "No se pudieron enviar las propuestas.", "error");
  }
}

function prepararResultadoSoloLectura() {
  for (let number = 1; number <= 3; number += 1) {
    const map = names(number);
    const result = field(map.resultadoEsperado);
    if (result) {
      result.readOnly = true;
      result.placeholder = "Se genera automáticamente al validar.";
    }
  }
}

function init() {
  prepararResultadoSoloLectura();
  byId("ta-estudiante-busqueda-form")?.addEventListener("submit", buscarEstudiante);
  byId("ta-estudiante-validar-btn")?.addEventListener("click", () => validarPropuestas({ mostrar: true }));
  byId("ta-estudiante-enviar-btn")?.addEventListener("click", enviarPropuestas);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
