/*
  Nombre completo: ta-titulo-articulo-admin.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
  Función o funciones:
  - Controlar la pantalla de administración del módulo Títulos en Electron y Netlify.
  - Cargar desde Firebase períodos, coordinadores, carreras, estudiantes y envíos.
  - Mostrar visibilidad completa del proceso de revisión de títulos.
  - Activar período, crear coordinadores, asignar carreras y limpiar pruebas de titulos/titulos_logs.
  - Unificar períodos repetidos en el selector principal del administrador.
  Se conecta con:
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/public/ta-titulo-articulo-admin.html
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-limpieza.service.js
*/

import { TaTituloArticuloApi } from "../services/ta-titulo-articulo-api-client.service.js";
import { TaTituloArticuloAdminLimpieza } from "./ta-titulo-articulo-admin-limpieza.service.js";

let state = {
  resumen: null,
  filtro: "",
  cargando: false
};

const $ = (id) => document.getElementById(id);
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalizar = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const MESES_PERIODO = Object.freeze({
  enero: { label: "Enero", orden: 1 },
  febrero: { label: "Febrero", orden: 2 },
  marzo: { label: "Marzo", orden: 3 },
  abril: { label: "Abril", orden: 4 },
  mayo: { label: "Mayo", orden: 5 },
  junio: { label: "Junio", orden: 6 },
  julio: { label: "Julio", orden: 7 },
  agosto: { label: "Agosto", orden: 8 },
  septiembre: { label: "Septiembre", orden: 9 },
  setiembre: { label: "Septiembre", orden: 9 },
  octubre: { label: "Octubre", orden: 10 },
  noviembre: { label: "Noviembre", orden: 11 },
  diciembre: { label: "Diciembre", orden: 12 }
});

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
  [
    "ta-admin-actualizar-btn",
    "ta-admin-activar-periodo-btn",
    "ta-admin-limpiar-btn"
  ].forEach((id) => {
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

function normalizarEstado(estado) {
  const value = clean(estado || "SIN_ENVIO").toUpperCase();
  if (value === "PENDIENTE") return "ENVIADO";
  if (value === "BORRADOR") return "SIN_ENVIO";
  return value || "SIN_ENVIO";
}

function estadoLabel(estado) {
  const labels = {
    SIN_ENVIO: "Sin envío",
    ENVIADO: "Enviado",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    APROBADO_CON_CORRECCIONES: "Aprobado con correcciones",
    DEVUELTO: "Devuelto"
  };
  return labels[normalizarEstado(estado)] || clean(estado || "SIN_ENVIO");
}

function getResumen() {
  return state.resumen || {
    periodos: [],
    coordinadores: [],
    carreras: [],
    estudiantes: [],
    envios: [],
    estadisticas: { totalEstudiantes: 0, totalEnvios: 0, porEstado: {}, sinCoordinador: 0 },
    periodoActivo: null
  };
}

function formatearPeriodoLabel(value) {
  return clean(value).replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/gi, (match) => {
    const key = normalizar(match);
    return MESES_PERIODO[key]?.label || match;
  });
}

function extraerMesAnioPeriodo(value) {
  const texto = normalizar(value);
  const patron = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(20\d{2})\b/g;
  const salida = [];
  let match = patron.exec(texto);
  while (match) {
    const mesKey = match[1] === "setiembre" ? "septiembre" : match[1];
    const mes = MESES_PERIODO[mesKey]?.orden || 0;
    salida.push({ anio: Number(match[2]), mes, key: `${match[2]}-${String(mes).padStart(2, "0")}` });
    match = patron.exec(texto);
  }
  return salida;
}

function clavePeriodo(periodo = {}) {
  const label = periodo.label || periodo.nombre || periodo.periodoLabel || periodo.id;
  const partes = extraerMesAnioPeriodo(label);
  if (partes.length >= 2) return `${partes[0].key}__${partes[1].key}`;
  if (partes.length === 1) return partes[0].key;
  return normalizar(label).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function ordenPeriodo(periodo = {}) {
  const partes = extraerMesAnioPeriodo(periodo.label || periodo.nombre || periodo.periodoLabel || periodo.id);
  if (!partes.length) return 0;
  return (partes[0].anio * 100) + partes[0].mes;
}

function periodosUnificados(periodos = [], periodoActivo = null) {
  const activoId = clean(periodoActivo?.id);
  const mapa = new Map();

  periodos.forEach((periodo, index) => {
    const key = clavePeriodo(periodo);
    if (!key) return;

    const label = formatearPeriodoLabel(periodo.label || periodo.nombre || periodo.periodoLabel || periodo.id);
    const item = {
      ...periodo,
      id: clean(periodo.id),
      label,
      key,
      orden: ordenPeriodo(periodo),
      index,
      activo: clean(periodo.id) === activoId
    };

    if (!mapa.has(key)) {
      mapa.set(key, item);
      return;
    }

    const actual = mapa.get(key);
    if (item.activo) {
      mapa.set(key, { ...actual, ...item, activo: true });
    } else if (!actual.id && item.id) {
      mapa.set(key, { ...actual, id: item.id, label: item.label, orden: actual.orden || item.orden });
    }
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.orden !== b.orden) return b.orden - a.orden;
    return a.index - b.index;
  });
}

function renderPeriodo() {
  const resumen = getResumen();
  const select = $("ta-admin-periodo-select");
  if (!select) return;

  const periodos = periodosUnificados(resumen.periodos || [], resumen.periodoActivo);

  select.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = periodos.length ? "Seleccione período" : "No hay períodos cargados";
  select.appendChild(empty);

  periodos.forEach((periodo) => {
    const option = document.createElement("option");
    option.value = clean(periodo.id);
    option.textContent = clean(periodo.label || periodo.nombre || periodo.id);
    select.appendChild(option);
  });

  if (resumen.periodoActivo?.id) select.value = clean(resumen.periodoActivo.id);
  setText("ta-admin-periodo-activo-label", formatearPeriodoLabel(resumen.periodoActivo?.label || resumen.periodoActivo?.id || "---"));
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
  setText("ta-admin-stat-revision", porEstado.EN_REVISION || 0);
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
  carrerasSinCoordinador.slice(0, 15).forEach((carrera) => {
    const li = document.createElement("li");
    li.textContent = `${clean(carrera.nombreCarrera || carrera.codigoCarrera)}: sin coordinador asignado.`;
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

function contarEstudiantesCoordinador(coordinadorId) {
  const resumen = getResumen();
  const coord = (resumen.coordinadores || []).find((item) => clean(item.id) === clean(coordinadorId));
  const codigos = new Set((coord?.carrerasAsignadas || []).map((c) => clean(c.codigoCarrera)).filter(Boolean));
  const nombres = new Set((coord?.carrerasAsignadas || []).map((c) => normalizar(c.nombreCarrera)).filter(Boolean));
  return (resumen.estudiantes || []).filter((est) => {
    const codigo = clean(est.codigoCarrera);
    const nombre = normalizar(est.carrera);
    return (codigo && codigos.has(codigo)) || (nombre && nombres.has(nombre));
  }).length;
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

function filtroCoincide(item, camposExtra = []) {
  const filtro = normalizar(state.filtro);
  if (!filtro) return true;
  const texto = camposExtra.concat([
    item.nombres,
    item.cedula,
    item.carrera,
    item.periodoId,
    item.periodoLabel,
    item.coordinadorNombre,
    item.estado,
    estadoLabel(item.estado),
    item.tituloElegidoTexto,
    item.tituloCorregidoCoordinador,
    item.observacionCoordinador
  ]).map(normalizar).join(" ");
  return texto.includes(filtro);
}

function estudiantesFiltrados() {
  const estudiantes = getResumen().estudiantes || [];
  return estudiantes.filter((item) => filtroCoincide(item));
}

function renderEstudiantes() {
  const body = $("ta-admin-estudiantes-body");
  if (!body) return;

  const rows = estudiantesFiltrados();
  body.replaceChildren();

  if (!rows.length) {
    body.appendChild(emptyRow(10, state.filtro ? "No hay estudiantes que coincidan con la búsqueda." : "Sin datos cargados."));
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
    row.appendChild(td(est.tituloPreferidoNumero ? `Título ${est.tituloPreferidoNumero}` : "---"));
    row.appendChild(td(est.tituloElegidoTexto || "---"));
    row.appendChild(td(est.tituloCorregidoCoordinador || "---"));
    row.appendChild(td(est.intentosUsados || 0));
    body.appendChild(row);
  });
}

function titulosTexto(envio) {
  const titulos = Array.isArray(envio.titulosEnviados) ? envio.titulosEnviados : [];
  if (!titulos.length) return "---";
  return titulos.map((item) => {
    const pref = Number(envio.tituloPreferidoNumero) === Number(item.numero) || item.preferido ? " *" : "";
    return `${item.numero}. ${clean(item.titulo || item.tituloFinal)}${pref}`;
  }).join(" | ");
}

function enviosFiltrados() {
  const envios = getResumen().envios || [];
  return envios.filter((envio) => filtroCoincide(envio, [titulosTexto(envio)]));
}

function renderEnvios() {
  const body = $("ta-admin-envios-body");
  if (!body) return;

  const rows = enviosFiltrados();
  body.replaceChildren();

  if (!rows.length) {
    body.appendChild(emptyRow(11, state.filtro ? "No hay envíos que coincidan con la búsqueda." : "Sin títulos enviados."));
    return;
  }

  rows.forEach((envio) => {
    const row = document.createElement("tr");
    row.appendChild(td(envio.nombres));
    row.appendChild(td(envio.cedula));
    row.appendChild(td(envio.carrera));
    row.appendChild(td(estadoLabel(envio.estado)));
    row.appendChild(td(titulosTexto(envio)));
    row.appendChild(td(envio.tituloPreferidoNumero ? `Título ${envio.tituloPreferidoNumero}` : "---"));
    row.appendChild(td(envio.tituloElegidoTexto || "---"));
    row.appendChild(td(envio.tituloCorregidoCoordinador || "---"));
    row.appendChild(td(envio.coordinadorNombre || "---"));
    row.appendChild(td(`${Number(envio.intentosUsados || 0)} de ${Number(envio.maxIntentos || 2)}`));
    row.appendChild(td(envio.enviadoEn || "---"));
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
  renderEnvios();
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

async function limpiarPruebas() {
  const input = $("ta-admin-limpiar-confirmacion");
  const confirmacion = clean(input?.value);

  if (confirmacion !== "BORRAR TITULOS") {
    message("ta-admin-limpiar-mensaje", "Debe escribir exactamente BORRAR TITULOS para limpiar pruebas.", "error");
    return;
  }

  const confirmar = window.confirm("Esta acción borrará todos los documentos de titulos y titulos_logs. No tocará Estudiantes, periodos ni titulos_coordinadores. ¿Desea continuar?");
  if (!confirmar) return;

  setBusy(true, "Limpiando títulos de prueba...");
  try {
    const data = await TaTituloArticuloAdminLimpieza.limpiarPruebasTitulos(confirmacion);
    if (input) input.value = "";
    await cargarResumen();
    message("ta-admin-limpiar-mensaje", data.mensaje || "Limpieza completada.", "ok");
  } catch (error) {
    console.error("[Títulos admin limpieza]", error);
    message("ta-admin-limpiar-mensaje", error.message || "No se pudo limpiar pruebas.", "error");
  } finally {
    setBusy(false);
  }
}

function init() {
  $("ta-admin-actualizar-btn")?.addEventListener("click", cargarResumen);
  $("ta-admin-activar-periodo-btn")?.addEventListener("click", activarPeriodo);
  $("ta-admin-coordinador-form")?.addEventListener("submit", guardarCoordinador);
  $("ta-admin-limpiar-btn")?.addEventListener("click", limpiarPruebas);
  $("ta-admin-buscar-estudiante")?.addEventListener("input", (event) => {
    state.filtro = clean(event.target.value);
    renderEstudiantes();
    renderEnvios();
  });
  cargarResumen();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
