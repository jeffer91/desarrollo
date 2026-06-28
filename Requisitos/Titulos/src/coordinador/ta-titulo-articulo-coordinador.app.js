/*
  Nombre completo: ta-titulo-articulo-coordinador.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/coordinador/ta-titulo-articulo-coordinador.app.js
  Función o funciones:
  - Controlar la pantalla pública del coordinador.
  - Cargar coordinadores activos desde Firebase directo/API.
  - Mostrar solo los envíos de las carreras asignadas al coordinador.
  - Leer la estructura limpia de titulos: titulosEnviados, tituloPreferidoNumero, título elegido y título corregido.
  - Permitir aprobar, aprobar con correcciones o devolver con observación obligatoria.
  Se conecta con:
  - Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
*/

import { TaTituloArticuloApi } from "../services/ta-titulo-articulo-api-client.service.js";

let state = {
  coordinadorId: "",
  estudiantes: [],
  filtro: "",
  actual: null,
  cargando: false
};

const $ = (id) => document.getElementById(id);
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalizar = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function msg(text, type = "") {
  const el = $("ta-coordinador-selector-mensaje");
  if (!el) return;
  el.textContent = clean(text);
  el.classList.remove("ta-message--error", "ta-message--ok", "ta-message--warning");
  if (type) el.classList.add(`ta-message--${type}`);
  el.hidden = !text;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = clean(value) || "---";
}

function show(id, visible) {
  const el = $(id);
  if (!el) return;
  el.hidden = !visible;
  if (id === "ta-coordinador-revision-modal") {
    el.setAttribute("aria-hidden", visible ? "false" : "true");
  }
}

function td(text) {
  const cell = document.createElement("td");
  cell.textContent = clean(text);
  return cell;
}

function normalizarEstado(estado) {
  const value = clean(estado || "SIN_ENVIO").toUpperCase();
  if (value === "PENDIENTE") return "ENVIADO";
  if (value === "BORRADOR") return "SIN_ENVIO";
  return value || "SIN_ENVIO";
}

function estadoLabel(estado) {
  const value = normalizarEstado(estado);
  const labels = {
    SIN_ENVIO: "Sin envío",
    ENVIADO: "Pendiente",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    APROBADO_CON_CORRECCIONES: "Aprobado con correcciones",
    DEVUELTO: "Devuelto"
  };
  return labels[value] || value;
}

function setBusy(isBusy, text = "") {
  state.cargando = Boolean(isBusy);
  const formButton = document.querySelector("#ta-coordinador-selector-form button");
  const saveButton = $("ta-revision-guardar-btn");
  if (formButton) formButton.disabled = state.cargando;
  if (saveButton) saveButton.disabled = state.cargando;
  if (text) msg(text, "warning");
}

async function cargarCoordinadores() {
  msg("Cargando coordinadores...", "warning");
  try {
    const data = await TaTituloArticuloApi.coordinador.listarCoordinadores();
    const select = $("ta-coordinador-selector");
    if (!select) return;

    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Seleccione un coordinador";
    select.appendChild(empty);

    (data.coordinadores || []).forEach((coord) => {
      const opt = document.createElement("option");
      opt.value = clean(coord.id);
      opt.textContent = clean(coord.nombre);
      select.appendChild(opt);
    });

    msg("", "ok");
  } catch (error) {
    console.error("[Títulos coordinador]", error);
    msg(error.message || "No se pudieron cargar coordinadores.", "error");
  }
}

function renderStats(estudiantes) {
  const conteo = estudiantes.reduce((acc, item) => {
    const estado = normalizarEstado(item.estado);
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});

  setText("ta-coord-stat-pendientes", conteo.ENVIADO || 0);
  setText("ta-coord-stat-revision", conteo.EN_REVISION || 0);
  setText("ta-coord-stat-aprobados", (conteo.APROBADO || 0) + (conteo.APROBADO_CON_CORRECCIONES || 0));
  setText("ta-coord-stat-devueltos", conteo.DEVUELTO || 0);
}

function titulosEnvio(item = {}) {
  const fuente = Array.isArray(item.titulosEnviados)
    ? item.titulosEnviados
    : (Array.isArray(item.propuestas) ? item.propuestas : []);

  return fuente.map((titulo, index) => ({
    numero: Number(titulo.numero || index + 1),
    titulo: clean(titulo.titulo || titulo.tituloFinal || titulo.texto || titulo.value || ""),
    preferido: Boolean(titulo.preferido)
  })).filter((titulo) => titulo.numero && titulo.titulo);
}

function tituloPorNumero(item, numero) {
  return titulosEnvio(item).find((titulo) => Number(titulo.numero) === Number(numero)) || null;
}

function aplicarFiltro(estudiantes) {
  const filtro = normalizar(state.filtro);
  if (!filtro) return estudiantes;

  return estudiantes.filter((item) => {
    const texto = [
      item.nombres,
      item.cedula,
      item.carrera,
      item.codigoCarrera,
      item.estado,
      estadoLabel(item.estado),
      item.tituloElegidoTexto,
      item.tituloCorregidoCoordinador,
      ...titulosEnvio(item).map((titulo) => titulo.titulo)
    ].map(normalizar).join(" ");
    return texto.includes(filtro);
  });
}

function renderTable(estudiantes) {
  const body = $("ta-coordinador-tabla-body");
  if (!body) return;

  const visibles = aplicarFiltro(estudiantes);
  body.replaceChildren();

  if (!visibles.length) {
    const row = document.createElement("tr");
    const cell = td(state.filtro ? "No hay estudiantes que coincidan con la búsqueda." : "No existen envíos para las carreras asignadas.");
    cell.colSpan = 5;
    cell.className = "ta-table-empty";
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  visibles.forEach((item) => {
    const row = document.createElement("tr");
    row.appendChild(td(item.nombres));
    row.appendChild(td(item.cedula));
    row.appendChild(td(item.carrera));
    row.appendChild(td(estadoLabel(item.estado)));

    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ta-button ta-button--primary";
    button.textContent = normalizarEstado(item.estado) === "ENVIADO" ? "Iniciar revisión" : "Revisar";
    button.addEventListener("click", () => abrirRevision(item));
    action.appendChild(button);
    row.appendChild(action);
    body.appendChild(row);
  });
}

async function cargarEstudiantes(event) {
  event?.preventDefault?.();
  state.coordinadorId = clean($("ta-coordinador-selector")?.value);

  if (!state.coordinadorId) {
    msg("Seleccione un coordinador.", "error");
    return;
  }

  setBusy(true, "Cargando estudiantes...");
  try {
    const data = await TaTituloArticuloApi.coordinador.cargarEstudiantes(state.coordinadorId);
    state.estudiantes = Array.isArray(data.estudiantes) ? data.estudiantes : [];
    state.filtro = clean($("ta-coordinador-buscar")?.value);

    renderStats(state.estudiantes);
    renderTable(state.estudiantes);
    show("ta-coordinador-resumen", true);
    show("ta-coordinador-tabla-card", true);
    msg("Estudiantes cargados.", "ok");
  } catch (error) {
    console.error("[Títulos coordinador estudiantes]", error);
    msg(error.message || "No se pudieron cargar estudiantes.", "error");
  } finally {
    setBusy(false);
  }
}

function prellenarRevision(item) {
  const estado = $("ta-revision-estado");
  const tituloCorregido = $("ta-revision-titulo-corregido");
  const observacion = $("ta-revision-observacion");

  if (estado) estado.value = ["APROBADO", "APROBADO_CON_CORRECCIONES", "DEVUELTO"].includes(normalizarEstado(item.estado)) ? normalizarEstado(item.estado) : "";
  if (tituloCorregido) tituloCorregido.value = clean(item.tituloCorregidoCoordinador || item.tituloCorregido || "");
  if (observacion) observacion.value = clean(item.observacionCoordinador || item.observacion || "");
}

function renderModal(item) {
  setText("ta-revision-estudiante", item.nombres);
  setText("ta-revision-cedula", item.cedula);
  setText("ta-revision-carrera", item.carrera);
  setText("ta-revision-estado-actual", estadoLabel(item.estado));
  setText("ta-revision-preferido", item.tituloPreferidoNumero ? `Título ${item.tituloPreferidoNumero}` : "---");
  setText("ta-revision-intentos", `${Number(item.intentosUsados || 0)} de ${Number(item.maxIntentos || 2)}`);
  setText("ta-revision-enviado", item.enviadoEn || item.fechaEnvio || "---");

  for (let n = 1; n <= 3; n += 1) {
    const titulo = tituloPorNumero(item, n);
    const extra = Number(item.tituloPreferidoNumero) === n ? " (preferido por estudiante)" : "";
    setText(`ta-revision-titulo-${n}`, titulo ? `${titulo.titulo}${extra}` : "---");
  }

  const elegidoActual = Number(item.tituloElegidoNumero || item.tituloPreferidoNumero || 0);
  document.querySelectorAll('[name="taTituloElegido"]').forEach((radio) => {
    radio.checked = Number(radio.value) === elegidoActual;
  });

  prellenarRevision(item);
}

async function iniciarRevisionSiCorresponde(item) {
  if (normalizarEstado(item.estado) !== "ENVIADO") return;
  try {
    await TaTituloArticuloApi.coordinador.iniciarRevision(item.envioId, state.coordinadorId);
    item.estado = "EN_REVISION";
    renderModal(item);
    renderStats(state.estudiantes);
    renderTable(state.estudiantes);
    msg("Revisión iniciada. Puede guardar su decisión.", "ok");
  } catch (error) {
    console.warn("[Títulos coordinador iniciar revisión]", error);
    msg(error.message || "No se pudo marcar el envío como en revisión, pero puede continuar revisando.", "warning");
  }
}

async function abrirRevision(item) {
  state.actual = item;
  renderModal(item);
  show("ta-coordinador-revision-modal", true);
  await iniciarRevisionSiCorresponde(item);
}

function cerrarModal() {
  show("ta-coordinador-revision-modal", false);
  state.actual = null;
}

function validarRevision(payload) {
  if (!payload.envioId) return "No se recibió el envío seleccionado.";
  if (!payload.coordinadorId) return "Seleccione un coordinador.";
  if (![1, 2, 3].includes(Number(payload.tituloElegidoNumero))) return "Seleccione uno de los 3 títulos.";
  if (!payload.estado) return "Seleccione la decisión de revisión.";
  if (payload.estado === "APROBADO_CON_CORRECCIONES" && !payload.tituloCorregidoCoordinador) return "Escriba el título corregido.";
  if (payload.estado === "DEVUELTO" && !payload.observacionCoordinador) return "La observación es obligatoria cuando devuelve.";
  return "";
}

async function guardarRevision() {
  if (!state.actual || state.cargando) return;

  const payload = {
    envioId: clean(state.actual.envioId || state.actual.docId),
    coordinadorId: state.coordinadorId,
    estado: clean($("ta-revision-estado")?.value),
    tituloElegidoNumero: Number(document.querySelector('[name="taTituloElegido"]:checked')?.value || 0),
    tituloCorregidoCoordinador: clean($("ta-revision-titulo-corregido")?.value),
    observacionCoordinador: clean($("ta-revision-observacion")?.value)
  };

  const error = validarRevision(payload);
  if (error) {
    msg(error, "error");
    return;
  }

  if (payload.estado === "DEVUELTO") {
    const confirmar = window.confirm("Va a devolver los títulos. El estudiante solo tendrá una oportunidad de reenvío. ¿Desea continuar?");
    if (!confirmar) return;
  }

  setBusy(true, "Guardando revisión...");
  try {
    const data = await TaTituloArticuloApi.coordinador.guardarRevision(payload);
    cerrarModal();
    await cargarEstudiantes();
    msg(data.mensaje || "Revisión guardada correctamente.", "ok");
  } catch (errorGuardar) {
    console.error("[Títulos coordinador revisión]", errorGuardar);
    msg(errorGuardar.message || "No se pudo guardar la revisión.", "error");
  } finally {
    setBusy(false);
  }
}

function ajustarCamposDecision() {
  const estado = clean($("ta-revision-estado")?.value);
  const tituloCorregido = $("ta-revision-titulo-corregido");
  const observacion = $("ta-revision-observacion");

  if (tituloCorregido) {
    tituloCorregido.required = estado === "APROBADO_CON_CORRECCIONES";
    tituloCorregido.placeholder = estado === "APROBADO_CON_CORRECCIONES" ? "Escriba el título final corregido" : "Solo si aprueba con correcciones";
  }
  if (observacion) {
    observacion.required = estado === "DEVUELTO";
    observacion.placeholder = estado === "DEVUELTO" ? "Explique claramente qué debe corregir el estudiante" : "Opcional si aprueba o corrige";
  }
}

function init() {
  $("ta-coordinador-selector-form")?.addEventListener("submit", cargarEstudiantes);
  $("ta-revision-guardar-btn")?.addEventListener("click", guardarRevision);
  $("ta-revision-estado")?.addEventListener("change", ajustarCamposDecision);
  $("ta-coordinador-buscar")?.addEventListener("input", (event) => {
    state.filtro = clean(event.target.value);
    renderTable(state.estudiantes);
  });
  document.querySelectorAll("[data-ta-close-modal]").forEach((el) => el.addEventListener("click", cerrarModal));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrarModal();
  });
  cargarCoordinadores();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
