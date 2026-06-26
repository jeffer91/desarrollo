/*
  Nombre completo: ta-titulo-articulo-admin.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
  Función o funciones:
  - Controlar la pantalla local/Electron del administrador.
  - Cargar desde Firebase períodos, coordinadores, carreras y estudiantes.
  - Trabajar sin token administrativo y sin Netlify Functions.
  - Escribir únicamente la configuración operativa del módulo Títulos y sus revisiones.
  Se conecta con:
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
*/

import { TaTituloArticuloApi } from "../services/ta-titulo-articulo-api-client.service.js";

let state = {
  resumen: null,
  filtro: "",
  cargando: false
};

const $ = (id) => document.getElementById(id);
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalizar = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value ?? "0");
}

function message(id, text, type = "") {
  const el = $(id);
  if (!el) return;
  el.textContent = clean(text);
  el.classList.remove("ta-message--error", "ta-message--ok", "ta-message--warning");
  if (type) el.classList.add(`ta-message--${type}`);
  el.hidden = !text;
}

function setBusy(isBusy, text = "") {
  state.cargando = Boolean(isBusy);
  ["ta-admin-actualizar-btn", "ta-admin-activar-periodo-btn"].forEach((id) => {
    const btn = $(id);
    if (btn) btn.disabled = state.cargando;
  });

  const formButton = document.querySelector("#ta-admin-coordinador-form button");
  if (formButton) formButton.disabled = state.cargando;
  if (text) message("ta-admin-periodo-mensaje", text, "warning");
}

function td(text) {
  const cell = document.createElement("td");
  cell.textContent = clean(text);
  return cell;
}

function emptyRow(colspan, text) {
  const row = document.createElement("tr");
  const cell = td(text);
  cell.colSpan = colspan;
  cell.className = "ta-table-empty";
  row.appendChild(cell);
  return row;
}

function estadoLabel(estado) {
  const labels = {
    SIN_ENVIO: "Sin envío",
    BORRADOR: "Borrador",
    ENVIADO: "Enviado",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    APROBADO_CON_CORRECCIONES: "Aprobado con correcciones",
    DEVUELTO: "Devuelto"
  };
  return labels[clean(estado)] || clean(estado || "SIN_ENVIO");
}

function getResumen() {
  return state.resumen || {
    periodos: [],
    coordinadores: [],
    carreras: [],
    estudiantes: [],
    estadisticas: { totalEstudiantes: 0, totalEnvios: 0, porEstado: {}, sinCoordinador: 0 },
    periodoActivo: null
  };
}

function renderPeriodo() {
  const resumen = getResumen();
  const select = $("ta-admin-periodo-select");
  if (!select) return;

  select.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = resumen.periodos.length ? "Seleccione período" : "No hay períodos cargados";
  select.appendChild(empty);

  resumen.periodos.forEach((periodo) => {
    const option = document.createElement("option");
    option.value = clean(periodo.id);
    option.textContent = clean(periodo.label || periodo.nombre || periodo.id);
    select.appendChild(option);
  });

  if (resumen.periodoActivo?.id) select.value = clean(resumen.periodoActivo.id);
}

function renderStats() {
  const resumen = getResumen();
  const stats = resumen.estadisticas || {};
  const porEstado = stats.porEstado || {};

  setText("ta-admin-stat-total", stats.totalEstudiantes || 0);
  setText("ta-admin-stat-enviados", stats.totalEnvios || porEstado.ENVIADO || 0);
  setText("ta-admin-stat-aprobados", (porEstado.APROBADO || 0) + (porEstado.APROBADO_CON_CORRECCIONES || 0));
  setText("ta-admin-stat-devueltos", porEstado.DEVUELTO || 0);
  setText("ta-admin-stat-sin-coord", stats.sinCoordinador || 0);
}

function renderAlertas() {
  const resumen = getResumen();
  const carrerasSinCoordinador = (resumen.carreras || []).filter((carrera) => !clean(carrera.coordinadorId));
  const box = $("ta-admin-alertas-lista");

  setText("ta-admin-alertas-total", carrerasSinCoordinador.length);
  if (!box) return;

  box.replaceChildren();
  if (!carrerasSinCoordinador.length) {
    box.className = "ta-empty-state";
    box.textContent = "Sin alertas registradas.";
    return;
  }

  box.className = "ta-state-box";
  const ul = document.createElement("ul");
  carrerasSinCoordinador.slice(0, 12).forEach((carrera) => {
    const li = document.createElement("li");
    li.textContent = `${clean(carrera.nombreCarrera)}: sin coordinador asignado.`;
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

function contarEstudiantesCoordinador(coordinadorId) {
  const resumen = getResumen();
  const coord = (resumen.coordinadores || []).find((item) => clean(item.id) === clean(coordinadorId));
  const codigos = new Set((coord?.carrerasAsignadas || []).map((c) => clean(c.codigoCarrera)));
  return (resumen.estudiantes || []).filter((est) => codigos.has(clean(est.codigoCarrera))).length;
}

function renderCoordinadores() {
  const body = $("ta-admin-coordinadores-body");
  const resumen = getResumen();
  if (!body) return;

  body.replaceChildren();
  if (!resumen.coordinadores.length) {
    body.appendChild(emptyRow(4, "Sin coordinadores cargados."));
    return;
  }

  resumen.coordinadores.forEach((coord) => {
    const row = document.createElement("tr");
    row.appendChild(td(coord.nombre));
    row.appendChild(td((coord.carrerasAsignadas || []).map((c) => c.nombreCarrera || c.codigoCarrera).join(", ") || "Sin carreras"));
    row.appendChild(td(contarEstudiantesCoordinador(coord.id)));
    row.appendChild(td(coord.activo === false ? "Inactivo" : "Activo"));
    body.appendChild(row);
  });
}

function crearSelectorCoordinador(carrera) {
  const resumen = getResumen();
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "8px";
  wrap.style.alignItems = "center";

  const select = document.createElement("select");
  select.style.minWidth = "190px";

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Sin asignar";
  select.appendChild(empty);

  resumen.coordinadores.forEach((coord) => {
    const opt = document.createElement("option");
    opt.value = clean(coord.id);
    opt.textContent = clean(coord.nombre);
    select.appendChild(opt);
  });

  select.value = clean(carrera.coordinadorId);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ta-button ta-button--primary";
  button.textContent = "Guardar";
  button.addEventListener("click", () => asignarCarrera(carrera, select.value));

  wrap.append(select, button);
  return wrap;
}

function renderCarreras() {
  const body = $("ta-admin-carreras-body");
  const resumen = getResumen();
  if (!body) return;

  body.replaceChildren();
  if (!resumen.carreras.length) {
    body.appendChild(emptyRow(3, "Active un período para cargar carreras."));
    return;
  }

  resumen.carreras.forEach((carrera) => {
    const row = document.createElement("tr");
    row.appendChild(td(carrera.nombreCarrera || carrera.codigoCarrera));

    const coordCell = document.createElement("td");
    coordCell.appendChild(crearSelectorCoordinador(carrera));
    row.appendChild(coordCell);

    row.appendChild(td(carrera.totalEstudiantes || 0));
    body.appendChild(row);
  });
}

function estudiantesFiltrados() {
  const resumen = getResumen();
  const filtro = normalizar(state.filtro);
  const estudiantes = resumen.estudiantes || [];
  if (!filtro) return estudiantes;

  return estudiantes.filter((item) => {
    const texto = [
      item.nombres,
      item.cedula,
      item.carrera,
      item.periodoId,
      item.coordinadorNombre,
      item.estado,
      estadoLabel(item.estado)
    ].map(normalizar).join(" ");
    return texto.includes(filtro);
  });
}

function renderEstudiantes() {
  const body = $("ta-admin-estudiantes-body");
  if (!body) return;

  const rows = estudiantesFiltrados();
  body.replaceChildren();

  if (!rows.length) {
    body.appendChild(emptyRow(7, state.filtro ? "No hay estudiantes que coincidan con la búsqueda." : "Sin datos cargados."));
    return;
  }

  rows.forEach((est) => {
    const row = document.createElement("tr");
    row.appendChild(td(est.nombres));
    row.appendChild(td(est.cedula));
    row.appendChild(td(est.carrera));
    row.appendChild(td(est.periodoId));
    row.appendChild(td(est.coordinadorNombre || "Sin coordinador"));
    row.appendChild(td(estadoLabel(est.estado)));
    row.appendChild(td(est.enviadoEn));
    body.appendChild(row);
  });
}

function renderAll() {
  renderPeriodo();
  renderStats();
  renderAlertas();
  renderCoordinadores();
  renderCarreras();
  renderEstudiantes();
}

async function cargarResumen() {
  setBusy(true, "Cargando resumen desde Firebase...");
  try {
    state.resumen = await TaTituloArticuloApi.admin.listarResumen();
    renderAll();
    message("ta-admin-periodo-mensaje", "Panel actualizado correctamente desde Firebase.", "ok");
  } catch (error) {
    console.error("[Títulos admin Firebase]", error);
    message("ta-admin-periodo-mensaje", error.message || "No se pudo cargar el panel administrativo.", "error");
  } finally {
    setBusy(false);
  }
}

async function activarPeriodo() {
  const periodoId = clean($("ta-admin-periodo-select")?.value);

  if (!periodoId) {
    message("ta-admin-periodo-mensaje", "Seleccione un período válido.", "error");
    return;
  }

  setBusy(true, "Activando período...");
  try {
    const data = await TaTituloArticuloApi.admin.activarPeriodo(periodoId);
    await cargarResumen();
    message("ta-admin-periodo-mensaje", data.mensaje || "Período activado correctamente.", "ok");
  } catch (error) {
    console.error("[Títulos admin período]", error);
    message("ta-admin-periodo-mensaje", error.message || "No se pudo activar el período.", "error");
  } finally {
    setBusy(false);
  }
}

async function guardarCoordinador(event) {
  event.preventDefault();
  const input = $("ta-admin-coordinador-nombre");
  const nombre = clean(input?.value);

  if (!nombre) {
    message("ta-admin-periodo-mensaje", "Ingrese el nombre del coordinador.", "error");
    return;
  }

  setBusy(true, "Guardando coordinador...");
  try {
    const data = await TaTituloArticuloApi.admin.guardarCoordinador(nombre);
    if (input) input.value = "";
    await cargarResumen();
    message("ta-admin-periodo-mensaje", data.mensaje || "Coordinador guardado correctamente.", "ok");
  } catch (error) {
    console.error("[Títulos admin coordinador]", error);
    message("ta-admin-periodo-mensaje", error.message || "No se pudo guardar el coordinador.", "error");
  } finally {
    setBusy(false);
  }
}

async function asignarCarrera(carrera, coordinadorId) {
  if (!coordinadorId) {
    message("ta-admin-periodo-mensaje", "Seleccione un coordinador para asignar la carrera.", "error");
    return;
  }

  setBusy(true, "Asignando carrera...");
  try {
    const data = await TaTituloArticuloApi.admin.asignarCoordinadorCarrera({
      coordinadorId,
      codigoCarrera: clean(carrera.codigoCarrera),
      nombreCarrera: clean(carrera.nombreCarrera)
    });
    await cargarResumen();
    message("ta-admin-periodo-mensaje", data.mensaje || "Carrera asignada correctamente.", "ok");
  } catch (error) {
    console.error("[Títulos admin carrera]", error);
    message("ta-admin-periodo-mensaje", error.message || "No se pudo asignar la carrera.", "error");
  } finally {
    setBusy(false);
  }
}

function init() {
  $("ta-admin-actualizar-btn")?.addEventListener("click", cargarResumen);
  $("ta-admin-activar-periodo-btn")?.addEventListener("click", activarPeriodo);
  $("ta-admin-coordinador-form")?.addEventListener("submit", guardarCoordinador);
  $("ta-admin-buscar-estudiante")?.addEventListener("input", (event) => {
    state.filtro = clean(event.target.value);
    renderEstudiantes();
  });
  cargarResumen();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
