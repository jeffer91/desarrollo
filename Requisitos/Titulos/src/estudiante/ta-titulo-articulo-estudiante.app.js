/*
  Nombre completo: ta-titulo-articulo-estudiante.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  Función o funciones:
  - Controlar la pantalla pública del estudiante.
  - Consultar estudiante por cédula.
  - Trabajar los 3 títulos por etapas.
  - Guardar localmente los datos de apoyo sin enviarlos a Firebase.
  - Solicitar dos sugerencias de título por etapa mediante cliente Gemini seguro con fallback local.
  - Enviar a Firebase solo los 3 títulos finales, el título preferido y datos mínimos.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-local-draft.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-coherencia.service.js
*/

import { TaTituloArticuloApi } from "../services/ta-titulo-articulo-api-client.service.js";
import { TaTituloArticuloGemini } from "../services/ta-titulo-articulo-gemini-client.service.js";
import { TaTituloArticuloLocalDraft } from "../services/ta-titulo-articulo-local-draft.service.js";
import { validarCoherenciaPropuesta } from "../services/ta-titulo-articulo-coherencia.service.js";

const TOTAL_PROPUESTAS = 3;
const ESTADOS_BLOQUEADOS = new Set(["ENVIADO", "EN_REVISION", "APROBADO", "APROBADO_CON_CORRECCIONES"]);

const state = {
  cedula: "",
  estudiante: null,
  periodoActivo: null,
  envio: null,
  etapaActual: 1,
  bloqueado: false,
  cargando: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const onlyDigits = (value) => String(value ?? "").replace(/\D+/g, "").trim();
const normalizar = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

function proposalCard(number) {
  return $(`[data-ta-propuesta="${number}"]`);
}

function carreraEstudiante() {
  return clean(state.estudiante?.carrera || state.estudiante?.nombreCarrera || state.estudiante?.NombreCarrera || "");
}

function codigoCarreraEstudiante() {
  return clean(state.estudiante?.codigoCarrera || state.estudiante?.CodigoCarrera || "");
}

function generarResultadoEsperado(propuesta) {
  const tema = clean(propuesta.temaGeneral || "tema planteado").toLowerCase();
  const grupo = clean(propuesta.grupoEstudio || "grupo de estudio").toLowerCase();
  return `Propuesta de mejora relacionada con ${tema} para ${grupo}.`;
}

function leerPropuesta(number, { autocompletarResultado = true } = {}) {
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

  if (autocompletarResultado && !propuesta.resultadoEsperado && propuesta.temaGeneral && propuesta.grupoEstudio) {
    propuesta.resultadoEsperado = generarResultadoEsperado(propuesta);
    setVal(map.resultadoEsperado, propuesta.resultadoEsperado);
  }

  return propuesta;
}

function escribirPropuesta(number, propuesta = {}) {
  const map = names(number);
  setVal(map.temaGeneral, propuesta.temaGeneral);
  setVal(map.lugarContexto, propuesta.lugarContexto);
  setVal(map.problemaNecesidad, propuesta.problemaNecesidad);
  setVal(map.grupoEstudio, propuesta.grupoEstudio);
  setVal(map.anioPeriodoDatos, propuesta.anioPeriodoDatos);
  setVal(map.objetivoArticulo, propuesta.objetivoArticulo);
  setVal(map.resultadoEsperado, propuesta.resultadoEsperado);
  setVal(map.tituloFinal, propuesta.tituloFinal || propuesta.titulo || "");
}

function contextoBorrador() {
  return {
    periodoId: state.periodoActivo?.id || state.periodoActivo?.label || "periodo",
    cedula: state.cedula || "cedula"
  };
}

function leerTodasPropuestas() {
  return [1, 2, 3].map((number) => leerPropuesta(number));
}

function obtenerTituloPreferido() {
  return Number($('[name="tituloPreferido"]:checked')?.value || 0);
}

function guardarBorradorLocal({ silencioso = true } = {}) {
  if (!state.estudiante || !state.periodoActivo || state.bloqueado) return false;
  const ok = TaTituloArticuloLocalDraft.guardar(contextoBorrador(), {
    cedula: state.cedula,
    periodoActivo: state.periodoActivo,
    estudiante: state.estudiante,
    etapaActual: state.etapaActual,
    telegramUser: clean(byId("ta-estudiante-telegram-user")?.value),
    tituloPreferidoNumero: obtenerTituloPreferido(),
    propuestas: leerTodasPropuestas()
  });
  actualizarEstadoBorrador(ok ? "Borrador local guardado" : "No se pudo guardar borrador local");
  if (!silencioso) msgPropuestas(ok ? "Etapa guardada en este navegador." : "No se pudo guardar el borrador local.", ok ? "ok" : "error");
  return ok;
}

function cargarBorradorLocal() {
  if (!state.estudiante || !state.periodoActivo || state.bloqueado) return;
  const borrador = TaTituloArticuloLocalDraft.cargar(contextoBorrador());
  if (!borrador) {
    actualizarEstadoBorrador("Sin borrador local");
    return;
  }

  if (borrador.telegramUser) byId("ta-estudiante-telegram-user").value = clean(borrador.telegramUser);
  (borrador.propuestas || []).forEach((propuesta, index) => escribirPropuesta(Number(propuesta.numero || index + 1), propuesta));
  if (borrador.tituloPreferidoNumero) {
    const radio = $(`[name="tituloPreferido"][value="${Number(borrador.tituloPreferidoNumero)}"]`);
    if (radio) radio.checked = true;
  }
  state.etapaActual = Math.min(Math.max(Number(borrador.etapaActual || 1), 1), TOTAL_PROPUESTAS);
  actualizarEstadoBorrador("Borrador local recuperado");
}

function limpiarBorradorLocal() {
  if (!state.estudiante || !state.periodoActivo) return;
  TaTituloArticuloLocalDraft.limpiar(contextoBorrador());
  actualizarEstadoBorrador("Borrador local enviado y limpiado");
}

function actualizarEstadoBorrador(text) {
  setText("ta-estudiante-borrador-estado", text || "Sin borrador local");
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
    PENDIENTE: "Enviado para revisión",
    ENVIADO: "Enviado para revisión",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    APROBADO_CON_CORRECCIONES: "Aprobado con correcciones",
    DEVUELTO: "Devuelto para corregir"
  };
  return labels[value] || value;
}

function agregarParrafo(parent, label, value) {
  if (!clean(value)) return;
  const p = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  p.append(strong, document.createTextNode(clean(value)));
  parent.appendChild(p);
}

function renderEstado() {
  const box = byId("ta-estudiante-estado-contenido");
  if (!box) return;
  box.replaceChildren();

  const envio = state.envio;
  if (!envio) {
    box.className = "ta-empty-state";
    box.textContent = "Sin revisión registrada.";
    return;
  }

  const tituloFinal = clean(envio.tituloCorregidoCoordinador || envio.tituloCorregido || envio.tituloElegidoTexto || "");
  box.className = "ta-state-box";
  agregarParrafo(box, "Estado", estadoLabel(envio.estado));
  agregarParrafo(box, "Título seleccionado", tituloFinal);
  agregarParrafo(box, "Observación", envio.observacionCoordinador || envio.observacion);
  agregarParrafo(box, "Fecha de envío", envio.enviadoEn || envio.fechaEnvio);

  if (envio.estado === "DEVUELTO" && envio.reenvioDisponible !== false) {
    agregarParrafo(box, "Reenvío", "Tiene una única oportunidad para reenviar sus títulos corregidos.");
  }
}

function restaurarEnvio(envio) {
  if (!envio) return;
  if (envio.telegramUser) byId("ta-estudiante-telegram-user").value = clean(envio.telegramUser);

  const titulos = Array.isArray(envio.titulosEnviados) ? envio.titulosEnviados : (Array.isArray(envio.propuestas) ? envio.propuestas : []);
  titulos.forEach((item, index) => {
    const numero = Number(item.numero || index + 1);
    const map = names(numero);
    setVal(map.tituloFinal, item.titulo || item.tituloFinal || "");
  });

  const preferido = Number(envio.tituloPreferidoNumero || envio.propuestaPreferidaNumero || titulos.find((t) => t.preferido)?.numero || 0);
  if (preferido) {
    const radio = $(`[name="tituloPreferido"][value="${preferido}"]`);
    if (radio) radio.checked = true;
  }
}

function estaBloqueadoPorEnvio(envio) {
  if (!envio) return false;
  if (envio.estado === "DEVUELTO") return envio.reenvioDisponible === false;
  return ESTADOS_BLOQUEADOS.has(clean(envio.estado));
}

function setFormularioBloqueado(bloqueado) {
  state.bloqueado = Boolean(bloqueado);
  $$("#ta-estudiante-propuestas-card input, #ta-estudiante-propuestas-card textarea, #ta-estudiante-propuestas-card button, #ta-estudiante-telegram-user").forEach((element) => {
    element.disabled = state.bloqueado;
  });
  byId("ta-estudiante-validar-btn")?.toggleAttribute("disabled", state.bloqueado);
  byId("ta-estudiante-enviar-btn")?.toggleAttribute("disabled", state.bloqueado);
  actualizarBotonesEtapa();
}

function propuestaTieneCamposApoyo(propuesta) {
  return Boolean(
    clean(propuesta.temaGeneral) &&
    clean(propuesta.lugarContexto) &&
    clean(propuesta.problemaNecesidad) &&
    clean(propuesta.grupoEstudio) &&
    clean(propuesta.anioPeriodoDatos) &&
    clean(propuesta.objetivoArticulo) &&
    clean(propuesta.resultadoEsperado)
  );
}

function validarCamposApoyo(propuesta, number, { mostrar = true } = {}) {
  const campos = [
    ["Tema general", propuesta.temaGeneral],
    ["Lugar o contexto", propuesta.lugarContexto],
    ["Problema o necesidad", propuesta.problemaNecesidad],
    ["Grupo de estudio", propuesta.grupoEstudio],
    ["Año o período de datos", propuesta.anioPeriodoDatos],
    ["Objetivo del artículo", propuesta.objetivoArticulo],
    ["Resultado esperado", propuesta.resultadoEsperado]
  ];
  const faltante = campos.find(([, value]) => !clean(value));
  if (faltante) {
    if (mostrar) msgPropuestas(`Complete ${faltante[0]} en el título ${number}.`, "error");
    return false;
  }
  return true;
}

function validarTituloEtapa(number, { mostrar = true } = {}) {
  const propuesta = leerPropuesta(number);
  if (!validarCamposApoyo(propuesta, number, { mostrar })) return false;
  if (!clean(propuesta.tituloFinal)) {
    if (mostrar) msgPropuestas(`Debe elegir o escribir el título final ${number}.`, "error");
    return false;
  }

  const resultado = validarCoherenciaPropuesta(propuesta, carreraEstudiante(), { forzar: true });
  if (!resultado.ok) {
    if (mostrar) msgPropuestas(`El título ${number} no mantiene coherencia suficiente con la carrera ${carreraEstudiante()}. Genere una sugerencia o ajuste el tema.`, "error");
    return false;
  }
  return true;
}

function titulosYaGenerados(excluirNumero = 0) {
  return leerTodasPropuestas()
    .filter((propuesta) => Number(propuesta.numero) !== Number(excluirNumero))
    .map((propuesta) => clean(propuesta.tituloFinal))
    .filter(Boolean);
}

function renderSugerencias(number, resultado) {
  const container = byId(`ta-sugerencias-${number}`);
  if (!container) return;
  container.replaceChildren();

  if (resultado.bloqueado) {
    const box = document.createElement("div");
    box.className = "ta-state-box ta-state-box--error";
    box.textContent = clean(resultado.motivo || "La información no corresponde a la carrera del estudiante.");
    container.appendChild(box);
    return;
  }

  (resultado.sugerencias || []).forEach((titulo, index) => {
    const card = document.createElement("div");
    card.className = "ta-state-box";

    const p = document.createElement("p");
    p.textContent = titulo;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ta-button ta-button--primary";
    button.textContent = `Usar sugerencia ${index + 1}`;
    button.addEventListener("click", () => {
      setVal(names(number).tituloFinal, titulo);
      msgPropuestas(`Sugerencia ${index + 1} aplicada al título ${number}.`, "ok");
      guardarBorradorLocal({ silencioso: true });
      renderResumen();
    });

    card.append(p, button);
    container.appendChild(card);
  });

  if (resultado.advertencia) {
    const help = document.createElement("p");
    help.className = "ta-help";
    help.textContent = resultado.advertencia;
    container.appendChild(help);
  }
}

async function generarSugerencias(number) {
  if (state.bloqueado || state.cargando) return;
  const propuesta = leerPropuesta(number);
  if (!validarCamposApoyo(propuesta, number)) return;

  const button = byId(`ta-generar-sugerencias-${number}`);
  if (button) button.disabled = true;
  state.cargando = true;
  msgPropuestas(`Generando sugerencias para el título ${number}...`, "warning");

  try {
    const resultado = await TaTituloArticuloGemini.generarSugerenciasTitulo({
      ...propuesta,
      carrera: carreraEstudiante(),
      codigoCarrera: codigoCarreraEstudiante(),
      numeroTitulo: number,
      tituloManual: propuesta.tituloFinal,
      titulosYaGenerados: titulosYaGenerados(number)
    });

    renderSugerencias(number, resultado);
    if (resultado.bloqueado) {
      msgPropuestas(resultado.motivo || "La propuesta no corresponde a la carrera.", "error");
    } else {
      msgPropuestas(`Revise las sugerencias del título ${number} o escriba su propia versión.`, "ok");
    }
  } catch (error) {
    console.error("[Títulos estudiante sugerencias]", error);
    msgPropuestas(error.message || "No se pudieron generar sugerencias.", "error");
  } finally {
    state.cargando = false;
    actualizarBotonesEtapa();
  }
}

function renderEtapa() {
  for (let number = 1; number <= TOTAL_PROPUESTAS; number += 1) {
    const card = proposalCard(number);
    if (card) card.hidden = number !== state.etapaActual;
  }
  setText("ta-estudiante-paso-actual", state.etapaActual);
  setText("ta-estudiante-paso-total", TOTAL_PROPUESTAS);
  actualizarBotonesEtapa();
  renderResumen();
}

function actualizarBotonesEtapa() {
  const anterior = byId("ta-estudiante-anterior-btn");
  const siguiente = byId("ta-estudiante-siguiente-btn");
  if (anterior) anterior.disabled = state.bloqueado || state.etapaActual <= 1;
  if (siguiente) siguiente.disabled = state.bloqueado || state.etapaActual >= TOTAL_PROPUESTAS;

  for (let number = 1; number <= TOTAL_PROPUESTAS; number += 1) {
    const propuesta = leerPropuesta(number, { autocompletarResultado: false });
    const btn = byId(`ta-generar-sugerencias-${number}`);
    if (btn) btn.disabled = state.bloqueado || state.cargando || !propuestaTieneCamposApoyo(propuesta);
  }
}

function moverEtapa(delta) {
  if (state.bloqueado) return;
  if (delta > 0 && !validarTituloEtapa(state.etapaActual)) return;
  guardarBorradorLocal({ silencioso: true });
  state.etapaActual = Math.min(Math.max(state.etapaActual + delta, 1), TOTAL_PROPUESTAS);
  renderEtapa();
}

function renderResumen() {
  const card = byId("ta-estudiante-resumen-card");
  const list = byId("ta-estudiante-resumen-lista");
  if (!card || !list) return;

  const propuestas = leerTodasPropuestas();
  const hayTitulos = propuestas.some((propuesta) => clean(propuesta.tituloFinal));
  card.hidden = !hayTitulos;
  list.replaceChildren();

  propuestas.forEach((propuesta) => {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `Título ${propuesta.numero}: `;
    p.append(strong, document.createTextNode(clean(propuesta.tituloFinal) || "Pendiente"));
    list.appendChild(p);
  });
}

function validarTodas({ mostrarOk = true } = {}) {
  if (!state.estudiante) {
    msgPropuestas("Primero consulte su cédula.", "error");
    return { ok: false, propuestas: [] };
  }

  const propuestas = [];
  for (let number = 1; number <= TOTAL_PROPUESTAS; number += 1) {
    const propuesta = leerPropuesta(number);
    propuestas.push(propuesta);
    if (!validarTituloEtapa(number)) return { ok: false, propuestas };
  }

  const titulos = propuestas.map((propuesta) => normalizar(propuesta.tituloFinal));
  if (new Set(titulos).size !== TOTAL_PROPUESTAS) {
    msgPropuestas("Los 3 títulos deben ser diferentes.", "error");
    return { ok: false, propuestas };
  }

  const preferido = obtenerTituloPreferido();
  if (![1, 2, 3].includes(preferido)) {
    msgPropuestas("Seleccione cuál de los 3 títulos prefiere.", "error");
    return { ok: false, propuestas };
  }

  if (mostrarOk) msgPropuestas("Los 3 títulos están listos para enviar.", "ok");
  return { ok: true, propuestas };
}

async function buscarEstudiante(event) {
  event?.preventDefault();
  const cedula = onlyDigits(byId("ta-estudiante-cedula")?.value);

  if (!cedula) {
    msgBusqueda("Ingrese una cédula válida.", "error");
    return;
  }

  try {
    msgBusqueda("Consultando estudiante...", "warning");
    const data = await TaTituloArticuloApi.estudiante.buscarPorCedula(cedula);

    state.cedula = cedula;
    state.estudiante = data.estudiante || null;
    state.periodoActivo = data.periodoActivo || null;
    state.envio = data.envio || null;
    state.etapaActual = 1;

    if (!state.estudiante) throw new Error("No se encontró el estudiante.");

    renderDatos();
    restaurarEnvio(state.envio);
    state.bloqueado = estaBloqueadoPorEnvio(state.envio);
    if (!state.bloqueado) cargarBorradorLocal();
    renderEstado();
    renderEtapa();
    setFormularioBloqueado(state.bloqueado);

    show("ta-estudiante-datos-card", true);
    show("ta-estudiante-telegram-card", true);
    show("ta-estudiante-propuestas-card", true);
    show("ta-estudiante-estado-card", true);

    if (state.bloqueado) {
      msgBusqueda("El envío ya está registrado y no puede editarse en este estado.", "warning");
    } else if (state.envio?.estado === "DEVUELTO") {
      msgBusqueda("Sus títulos fueron devueltos. Recuerde que solo tiene una oportunidad de reenvío.", "warning");
    } else {
      msgBusqueda("Estudiante encontrado. Puede completar sus títulos por etapas.", "ok");
    }
  } catch (error) {
    console.error("[Títulos estudiante]", error);
    msgBusqueda(error.message || "No se pudo consultar la cédula.", "error");
    show("ta-estudiante-datos-card", false);
    show("ta-estudiante-telegram-card", false);
    show("ta-estudiante-propuestas-card", false);
    show("ta-estudiante-estado-card", false);
  }
}

async function enviarPropuestas() {
  if (state.bloqueado) {
    msgPropuestas("El envío ya no se puede editar en este estado.", "error");
    return;
  }
  if (!state.estudiante || !state.periodoActivo) {
    msgPropuestas("Primero consulte su cédula.", "error");
    return;
  }

  const validacion = validarTodas({ mostrarOk: false });
  if (!validacion.ok) return;

  const tituloPreferidoNumero = obtenerTituloPreferido();
  const titulosEnviados = validacion.propuestas.map((propuesta) => ({
    numero: propuesta.numero,
    titulo: clean(propuesta.tituloFinal),
    preferido: propuesta.numero === tituloPreferidoNumero
  }));

  try {
    msgPropuestas("Enviando títulos a revisión...", "warning");
    const data = await TaTituloArticuloApi.estudiante.enviarPropuestas({
      cedula: state.cedula,
      telegramUser: clean(byId("ta-estudiante-telegram-user")?.value),
      tituloPreferidoNumero,
      titulosEnviados,
      propuestas: validacion.propuestas
    });

    state.envio = data.envio || null;
    limpiarBorradorLocal();
    renderEstado();
    setFormularioBloqueado(true);
    show("ta-estudiante-estado-card", true);
    msgPropuestas(data.mensaje || "Títulos enviados correctamente.", "ok");
  } catch (error) {
    console.error("[Títulos estudiante envío]", error);
    msgPropuestas(error.message || "No se pudieron enviar los títulos.", "error");
  }
}

function prepararResultadoSoloLectura() {
  for (let number = 1; number <= TOTAL_PROPUESTAS; number += 1) {
    const result = field(names(number).resultadoEsperado);
    if (result) {
      result.readOnly = true;
      result.placeholder = "Se genera automáticamente al llenar tema y grupo.";
    }
  }
}

function registrarEventosFormulario() {
  $$('[data-ta-generar-sugerencias]').forEach((button) => {
    button.addEventListener("click", () => generarSugerencias(Number(button.dataset.taGenerarSugerencias)));
  });

  $$("#ta-estudiante-propuestas-card input, #ta-estudiante-propuestas-card textarea, #ta-estudiante-telegram-user").forEach((element) => {
    element.addEventListener("input", () => {
      if (!state.bloqueado) {
        leerTodasPropuestas();
        actualizarBotonesEtapa();
        renderResumen();
        guardarBorradorLocal({ silencioso: true });
      }
    });
    element.addEventListener("change", () => {
      if (!state.bloqueado) guardarBorradorLocal({ silencioso: true });
    });
  });
}

function init() {
  prepararResultadoSoloLectura();
  registrarEventosFormulario();
  byId("ta-estudiante-busqueda-form")?.addEventListener("submit", buscarEstudiante);
  byId("ta-estudiante-anterior-btn")?.addEventListener("click", () => moverEtapa(-1));
  byId("ta-estudiante-siguiente-btn")?.addEventListener("click", () => moverEtapa(1));
  byId("ta-estudiante-guardar-etapa-btn")?.addEventListener("click", () => guardarBorradorLocal({ silencioso: false }));
  byId("ta-estudiante-validar-btn")?.addEventListener("click", () => validarTodas({ mostrarOk: true }));
  byId("ta-estudiante-enviar-btn")?.addEventListener("click", enviarPropuestas);
  renderEtapa();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
