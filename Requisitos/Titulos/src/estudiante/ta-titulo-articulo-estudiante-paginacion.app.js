/*
  Nombre completo: ta-titulo-articulo-estudiante-paginacion.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante-paginacion.app.js
  Función o funciones:
  - Convertir la pantalla del estudiante en un flujo paginado tipo asistente.
  - Mostrar una sola acción por paso: cédula, datos, Telegram, título 1, título 2, título 3, resumen y estado.
  - Mostrar el aviso importante apenas el estudiante consulta su cédula, mientras Firebase carga sus datos.
  - Reutilizar la lógica existente de guardado, validación, sugerencias y envío sin cambiar el esquema de Firebase.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-coherencia.service.js
*/

import { validarCoherenciaPropuesta } from "../services/ta-titulo-articulo-coherencia.service.js";

const TOTAL_PROPUESTAS = 3;

const PASOS = Object.freeze([
  { id: 1, label: "Cédula", detalle: "Identificación" },
  { id: 2, label: "Datos", detalle: "Verificación" },
  { id: 3, label: "Telegram", detalle: "Avisos" },
  { id: 4, label: "Título 1", detalle: "Propuesta 1" },
  { id: 5, label: "Título 2", detalle: "Propuesta 2" },
  { id: 6, label: "Título 3", detalle: "Propuesta 3" },
  { id: 7, label: "Resumen", detalle: "Envío" },
  { id: 8, label: "Estado", detalle: "Revisión" }
]);

const state = {
  pasoActual: 1,
  estudianteCargado: false,
  aplicando: false,
  syncTimer: null,
  avisoLeido: false,
  modalContinuar: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalizar = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function byId(id) {
  return document.getElementById(id);
}

function estaVacioVisual(value) {
  const text = clean(value);
  return !text || text === "---";
}

function setHidden(element, hidden) {
  if (element) element.hidden = Boolean(hidden);
}

function setMsg(id, text, type = "") {
  const element = byId(id);
  if (!element) return;
  element.textContent = clean(text);
  element.classList.remove("ta-message--error", "ta-message--ok", "ta-message--warning");
  if (type) element.classList.add(`ta-message--${type}`);
  element.hidden = !text;
}

function msgBusqueda(text, type = "") {
  setMsg("ta-estudiante-busqueda-mensaje", text, type);
}

function msgPropuestas(text, type = "") {
  setMsg("ta-estudiante-propuestas-mensaje", text, type);
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

function field(name) {
  return $(`[name="${name}"]`);
}

function val(name) {
  return clean(field(name)?.value);
}

function carreraEstudiante() {
  return clean(byId("ta-estudiante-dato-carrera")?.textContent);
}

function estudianteVisibleDesdeApp() {
  const datosCard = byId("ta-estudiante-datos-card");
  const cedula = clean(byId("ta-estudiante-dato-cedula")?.textContent);
  return Boolean(datosCard && !datosCard.hidden && !estaVacioVisual(cedula));
}

function estudianteYaIdentificado() {
  if (state.estudianteCargado) return true;
  const cedula = clean(byId("ta-estudiante-dato-cedula")?.textContent);
  return !estaVacioVisual(cedula);
}

function crearPasoItem(paso) {
  const item = document.createElement("li");
  item.className = "ta-wizard-step";
  item.dataset.taWizardStep = String(paso.id);
  item.dataset.state = "pending";

  const number = document.createElement("span");
  number.className = "ta-wizard-step__number";
  number.textContent = String(paso.id);

  const label = document.createElement("span");
  label.className = "ta-wizard-step__label";
  label.textContent = paso.label;

  item.append(number, label);
  return item;
}

function crearModalAviso() {
  if (byId("ta-estudiante-aviso-modal")) return;

  const modal = document.createElement("section");
  modal.className = "ta-wizard-modal";
  modal.id = "ta-estudiante-aviso-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "ta-estudiante-aviso-title");

  modal.innerHTML = `
    <div class="ta-wizard-modal__backdrop" data-ta-aviso-cerrar></div>
    <article class="ta-wizard-modal__dialog">
      <button class="ta-icon-button ta-wizard-modal__close" type="button" data-ta-aviso-cerrar aria-label="Cerrar aviso">×</button>
      <p class="ta-brand__eyebrow">Aviso importante</p>
      <h2 id="ta-estudiante-aviso-title">Sus títulos serán revisados</h2>
      <ul class="ta-wizard-modal__list">
        <li>Elija 3 títulos claros y relacionados con su carrera.</li>
        <li>El coordinador validará y aprobará el título final.</li>
        <li>Si le devuelven, solo tendrá 1 intento de corrección.</li>
      </ul>
      <p class="ta-wizard-modal__note">Revise bien antes de enviar.</p>
      <div class="ta-actions ta-actions--end">
        <button class="ta-button ta-button--primary" type="button" id="ta-estudiante-aviso-continuar-btn">Entendido</button>
      </div>
    </article>
  `;

  document.body.appendChild(modal);
  modal.querySelectorAll("[data-ta-aviso-cerrar]").forEach((element) => element.addEventListener("click", cerrarAvisoImportante));
  byId("ta-estudiante-aviso-continuar-btn")?.addEventListener("click", cerrarAvisoImportante);
}

function abrirAvisoImportante({ continuarAlCerrar = false } = {}) {
  crearModalAviso();
  state.modalContinuar = Boolean(continuarAlCerrar);
  const modal = byId("ta-estudiante-aviso-modal");
  if (!modal) return;
  modal.hidden = false;
  byId("ta-estudiante-aviso-continuar-btn")?.focus();
}

function cerrarAvisoImportante() {
  const modal = byId("ta-estudiante-aviso-modal");
  if (modal) modal.hidden = true;
  state.avisoLeido = true;

  if (state.modalContinuar) {
    state.modalContinuar = false;
    state.pasoActual = Math.max(state.pasoActual + 1, 3);
    aplicarPaso();
  }
}

function mostrarAvisoAlConsultarCedula() {
  const cedula = clean(byId("ta-estudiante-cedula")?.value);
  if (!cedula) return;
  state.avisoLeido = false;
  state.modalContinuar = false;
  abrirAvisoImportante({ continuarAlCerrar: false });
}

function crearPaginacion() {
  const main = byId("ta-estudiante-app");
  if (!main || byId("ta-estudiante-wizard-progress")) return;

  main.classList.add("ta-estudiante-wizard-activo");

  const progress = document.createElement("section");
  progress.className = "ta-card ta-card--compact ta-wizard-progress";
  progress.id = "ta-estudiante-wizard-progress";
  progress.setAttribute("aria-label", "Progreso de carga de títulos");

  const heading = document.createElement("div");
  heading.className = "ta-section-heading";
  heading.innerHTML = `
    <div>
      <h2>Proceso</h2>
      <p id="ta-estudiante-wizard-detalle">${PASOS[0].detalle}</p>
    </div>
    <span class="ta-badge ta-badge--soft" id="ta-estudiante-wizard-contador">Paso 1 de ${PASOS.length}</span>
  `;

  const list = document.createElement("ol");
  list.className = "ta-wizard-progress__list";
  PASOS.forEach((paso) => list.appendChild(crearPasoItem(paso)));

  progress.append(heading, list);

  const nav = document.createElement("section");
  nav.className = "ta-card ta-card--compact ta-wizard-nav";
  nav.id = "ta-estudiante-paginacion-card";
  nav.innerHTML = `
    <div class="ta-wizard-nav__content">
      <p class="ta-help" id="ta-estudiante-wizard-ayuda">Complete este paso para continuar.</p>
      <div class="ta-actions ta-actions--between">
        <button class="ta-button ta-button--secondary" type="button" id="ta-estudiante-wizard-anterior-btn">Anterior</button>
        <button class="ta-button ta-button--primary" type="button" id="ta-estudiante-wizard-siguiente-btn">Continuar</button>
      </div>
    </div>
  `;

  const header = main.querySelector(".ta-header");
  if (header) header.insertAdjacentElement("afterend", progress);
  main.appendChild(nav);

  byId("ta-estudiante-wizard-anterior-btn")?.addEventListener("click", irAnterior);
  byId("ta-estudiante-wizard-siguiente-btn")?.addEventListener("click", irSiguiente);
}

function pasoActivo() {
  return PASOS.find((paso) => paso.id === state.pasoActual) || PASOS[0];
}

function actualizarProgreso() {
  const paso = pasoActivo();
  const detalle = byId("ta-estudiante-wizard-detalle");
  const contador = byId("ta-estudiante-wizard-contador");

  if (detalle) detalle.textContent = paso.detalle;
  if (contador) contador.textContent = `Paso ${paso.id} de ${PASOS.length}`;

  $$("[data-ta-wizard-step]").forEach((item) => {
    const id = Number(item.dataset.taWizardStep || 0);
    item.dataset.state = id < state.pasoActual ? "done" : (id === state.pasoActual ? "active" : "pending");
  });
}

function actualizarNavegacion() {
  const nav = byId("ta-estudiante-paginacion-card");
  const anterior = byId("ta-estudiante-wizard-anterior-btn");
  const siguiente = byId("ta-estudiante-wizard-siguiente-btn");
  const ayuda = byId("ta-estudiante-wizard-ayuda");

  if (!nav || !anterior || !siguiente) return;

  nav.hidden = state.pasoActual === 1 && !estudianteYaIdentificado();
  anterior.hidden = state.pasoActual <= 1;
  siguiente.hidden = state.pasoActual >= PASOS.length;
  siguiente.textContent = state.pasoActual === 7 ? "Ver estado" : "Continuar";

  if (ayuda) ayuda.textContent = pasoActivo().detalle;
}

function numeroPropuestaDesdePaso() {
  if (state.pasoActual < 4 || state.pasoActual > 6) return 0;
  return state.pasoActual - 3;
}

function ocultarAccionesInternasPropuestas() {
  $$("#ta-estudiante-propuestas-card > .ta-actions--between").forEach((element) => {
    element.classList.add("ta-wizard-hidden");
  });
}

function mostrarAccionesEnvio(mostrar) {
  $$("#ta-estudiante-propuestas-card > .ta-actions--end").forEach((element) => setHidden(element, !mostrar));
}

function aplicarVisibilidadPropuestas() {
  const numero = numeroPropuestaDesdePaso();
  const esResumen = state.pasoActual === 7;

  $$("[data-ta-propuesta]").forEach((article) => {
    const actual = Number(article.dataset.taPropuesta || 0);
    setHidden(article, !numero || actual !== numero);
  });

  setHidden(byId("ta-estudiante-resumen-card"), !esResumen);
  mostrarAccionesEnvio(esResumen);
  ocultarAccionesInternasPropuestas();

  const pasoActual = byId("ta-estudiante-paso-actual");
  const pasoTotal = byId("ta-estudiante-paso-total");
  if (pasoActual) pasoActual.textContent = numero ? String(numero) : String(TOTAL_PROPUESTAS);
  if (pasoTotal) pasoTotal.textContent = String(TOTAL_PROPUESTAS);
}

function aplicarPaso({ scroll = true } = {}) {
  if (state.aplicando) return;
  state.aplicando = true;

  if (!estudianteYaIdentificado() && state.pasoActual > 1) {
    state.pasoActual = 1;
  }

  const enPropuestas = state.pasoActual >= 4 && state.pasoActual <= 7;

  setHidden(byId("ta-estudiante-busqueda-card"), state.pasoActual !== 1);
  setHidden(byId("ta-estudiante-datos-card"), state.pasoActual !== 2);
  setHidden(byId("ta-estudiante-telegram-card"), state.pasoActual !== 3);
  setHidden(byId("ta-estudiante-propuestas-card"), !enPropuestas);
  setHidden(byId("ta-estudiante-estado-card"), state.pasoActual !== 8);
  setHidden(byId("ta-unico-reenvio-aviso"), true);

  if (enPropuestas) aplicarVisibilidadPropuestas();

  actualizarProgreso();
  actualizarNavegacion();

  if (scroll) {
    byId("ta-estudiante-wizard-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.setTimeout(() => {
    state.aplicando = false;
  }, 0);
}

function enfocarCampo(nombre) {
  const element = field(nombre);
  if (!element) return;
  element.focus();
  if (typeof element.reportValidity === "function") element.reportValidity();
}

function leerPropuesta(number) {
  const map = names(number);
  return {
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
}

function validarPropuesta(number) {
  const propuesta = leerPropuesta(number);
  const map = names(number);
  const campos = [
    ["Tema general", propuesta.temaGeneral, map.temaGeneral],
    ["Lugar o contexto", propuesta.lugarContexto, map.lugarContexto],
    ["Problema o necesidad", propuesta.problemaNecesidad, map.problemaNecesidad],
    ["Grupo de estudio", propuesta.grupoEstudio, map.grupoEstudio],
    ["Año o período de datos", propuesta.anioPeriodoDatos, map.anioPeriodoDatos],
    ["Objetivo del artículo", propuesta.objetivoArticulo, map.objetivoArticulo],
    ["Resultado esperado", propuesta.resultadoEsperado, map.resultadoEsperado],
    ["Título final", propuesta.tituloFinal, map.tituloFinal]
  ];

  const faltante = campos.find(([, value]) => !clean(value));
  if (faltante) {
    msgPropuestas(`Complete ${faltante[0]} en el título ${number}.`, "error");
    enfocarCampo(faltante[2]);
    return false;
  }

  const resultado = validarCoherenciaPropuesta(propuesta, carreraEstudiante(), { forzar: true });
  if (!resultado.ok) {
    msgPropuestas(`Ajuste el título ${number} para que corresponda a ${carreraEstudiante()}.`, "error");
    enfocarCampo(map.tituloFinal);
    return false;
  }

  msgPropuestas(`Título ${number} completo.`, "ok");
  byId("ta-estudiante-guardar-etapa-btn")?.click();
  return true;
}

function validarTitulosDiferentes() {
  const titulos = [1, 2, 3].map((number) => normalizar(val(names(number).tituloFinal))).filter(Boolean);
  if (titulos.length !== TOTAL_PROPUESTAS) return true;
  if (new Set(titulos).size !== TOTAL_PROPUESTAS) {
    msgPropuestas("Los 3 títulos deben ser diferentes.", "error");
    return false;
  }
  return true;
}

function validarAntesDeContinuar() {
  if (state.pasoActual === 1) {
    const cedula = clean(byId("ta-estudiante-cedula")?.value);
    if (!cedula) {
      msgBusqueda("Ingrese la cédula.", "error");
      byId("ta-estudiante-cedula")?.focus();
      return false;
    }
  }

  if (state.pasoActual > 1 && !estudianteYaIdentificado()) {
    msgBusqueda("Primero consulte una cédula válida.", "error");
    state.pasoActual = 1;
    aplicarPaso();
    return false;
  }

  const numero = numeroPropuestaDesdePaso();
  if (numero && !validarPropuesta(numero)) return false;
  if (state.pasoActual === 6 && !validarTitulosDiferentes()) return false;

  return true;
}

function irSiguiente() {
  if (!validarAntesDeContinuar()) return;
  state.pasoActual = Math.min(state.pasoActual + 1, PASOS.length);
  aplicarPaso();
}

function irAnterior() {
  state.pasoActual = Math.max(state.pasoActual - 1, 1);
  aplicarPaso();
}

function sincronizarCargaEstudiante() {
  if (state.aplicando) return;

  if (!state.estudianteCargado && estudianteVisibleDesdeApp()) {
    state.estudianteCargado = true;
    state.pasoActual = 2;
    aplicarPaso();
    return;
  }

  if (state.estudianteCargado && state.pasoActual >= 4 && state.pasoActual <= 7) {
    aplicarPaso({ scroll: false });
  }
}

function programarSincronizacion() {
  window.clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(sincronizarCargaEstudiante, 80);
}

function observarCambiosApp() {
  const main = byId("ta-estudiante-app");
  if (!main) return;

  const observer = new MutationObserver(programarSincronizacion);
  observer.observe(main, {
    attributes: true,
    attributeFilter: ["hidden", "disabled"],
    childList: true,
    subtree: true,
    characterData: true
  });
}

function registrarEventos() {
  byId("ta-estudiante-busqueda-form")?.addEventListener("submit", mostrarAvisoAlConsultarCedula, { capture: true });

  byId("ta-estudiante-enviar-btn")?.addEventListener("click", () => {
    window.setTimeout(() => {
      const enviar = byId("ta-estudiante-enviar-btn");
      const mensaje = clean(byId("ta-estudiante-propuestas-mensaje")?.textContent);
      if (enviar?.disabled || mensaje.toLowerCase().includes("enviados correctamente")) {
        state.pasoActual = 8;
        aplicarPaso();
      }
    }, 1200);
  });

  $$("#ta-estudiante-propuestas-card input, #ta-estudiante-propuestas-card textarea").forEach((element) => {
    element.addEventListener("input", () => window.setTimeout(() => aplicarPaso({ scroll: false }), 0));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !byId("ta-estudiante-aviso-modal")?.hidden) cerrarAvisoImportante();
  });
}

function init() {
  crearModalAviso();
  crearPaginacion();
  registrarEventos();
  observarCambiosApp();
  aplicarPaso({ scroll: false });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
