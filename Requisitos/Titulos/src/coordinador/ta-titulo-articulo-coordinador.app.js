/*
  Nombre completo: ta-titulo-articulo-coordinador.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/coordinador/ta-titulo-articulo-coordinador.app.js
  Función o funciones:
  - Controlar la pantalla pública del coordinador.
  - Cargar coordinadores activos desde la API.
  - Mostrar solo los estudiantes de las carreras asignadas al coordinador.
  - Permitir buscar estudiantes por nombre, cédula, carrera o estado.
  - Abrir modal de revisión de títulos.
  - Guardar decisión del coordinador: aprobar, aprobar con correcciones o devolver.
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

function estadoLabel(estado) {
  const value = clean(estado || "SIN_ENVIO");
  const labels = {
    SIN_ENVIO: "Sin envío",
    BORRADOR: "Borrador",
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
    const estado = clean(item.estado || "SIN_ENVIO");
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});

  setText("ta-coord-stat-pendientes", conteo.ENVIADO || 0);
  setText("ta-coord-stat-revision", conteo.EN_REVISION || 0);
  setText("ta-coord-stat-aprobados", (conteo.APROBADO || 0) + (conteo.APROBADO_CON_CORRECCIONES || 0));
  setText("ta-coord-stat-devueltos", conteo.DEVUELTO || 0);
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
      estadoLabel(item.estado)
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
    button.textContent = "Revisar";
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

function propuestaPorNumero(item, numero) {
  return (item.propuestas || []).find((prop) => Number(prop.numero) === Number(numero)) || null;
}

function abrirRevision(item) {
  state.actual = item;

  setText("ta-revision-estudiante", item.nombres);
  setText("ta-revision-cedula", item.cedula);
  setText("ta-revision-carrera", item.carrera);
  setText("ta-revision-preferido", item.tituloPreferidoNumero || "---");

  for (let n = 1; n <= 3; n += 1) {
    const propuesta = propuestaPorNumero(item, n);
    setText(`ta-revision-titulo-${n}`, propuesta?.tituloFinal || "---");
  }

  document.querySelectorAll('[name="taTituloElegido"]').forEach((radio) => {
    radio.checked = Number(radio.value) === Number(item.tituloPreferidoNumero);
  });

  const estado = $("ta-revision-estado");
  const tituloCorregido = $("ta-revision-titulo-corregido");
  const observacion = $("ta-revision-observacion");

  if (estado) estado.value = "";
  if (tituloCorregido) tituloCorregido.value = "";
  if (observacion) observacion.value = "";

  show("ta-coordinador-revision-modal", true);
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
  if (payload.estado === "APROBADO_CON_CORRECCIONES" && !payload.tituloCorregido) return "Escriba el título corregido.";
  if (payload.estado === "DEVUELTO" && !payload.observacion) return "La observación es obligatoria cuando devuelve.";
  return "";
}

async function guardarRevision() {
  if (!state.actual || state.cargando) return;

  const payload = {
    envioId: clean(state.actual.envioId),
    coordinadorId: state.coordinadorId,
    estado: clean($("ta-revision-estado")?.value),
    tituloElegidoNumero: Number(document.querySelector('[name="taTituloElegido"]:checked')?.value || 0),
    tituloCorregido: clean($("ta-revision-titulo-corregido")?.value),
    observacion: clean($("ta-revision-observacion")?.value)
  };

  const error = validarRevision(payload);
  if (error) {
    msg(error, "error");
    return;
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

function init() {
  $("ta-coordinador-selector-form")?.addEventListener("submit", cargarEstudiantes);
  $("ta-revision-guardar-btn")?.addEventListener("click", guardarRevision);
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
