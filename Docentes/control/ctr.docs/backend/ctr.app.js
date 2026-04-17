/* =========================================================
Nombre del archivo: ctr.app.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.app.js
Función o funciones:
- start(): boot del módulo CTR
- Modo 1: Periodo + Capacitación -> lista por cap y edita checks
- Modo 2: Solo Periodo -> lista por capIds del periodo; acuerdo deshabilitado
- Corrección rápida de nombres/apellidos en tabla
- Intercambiar / Restablecer nombres-apellidos por fila
- Orden por clic en encabezados
- Búsqueda + Export CSV (sobre vista actual)
- Lock UI al guardar
========================================================= */
import {
  listarCapacitaciones,
  listarDocentesPorCapacitacion,
  listarDocentesPorCapIds
} from "./ctr.repo.js";
import { $, setMsg, setFloatSave } from "./ctr.util.js";
import { renderPeriodos, renderCaps, bindFilters } from "./ctr.flt.js";
import { renderTable, bindTableChanges } from "./ctr.tbl.js";
import { bindSave } from "./ctr.save.js";
import { createState, resetOnPeriodo, resetOnCap } from "./ctr.state.js";
import { getBaseChecklist, buildCapIds, sameChecklist } from "./ctr.adapt.js";
import { applySearch } from "./ctr.search.js";
import { exportCsv } from "./ctr.export.js";
import { setLocked } from "./ctr.lock.js";

const S = createState();

S.q = "";
S.sortField = "apellidos";
S.sortDir = "asc";

const STATUS_FIELDS = new Set([
  "estadoDocente",
  "planIndividual",
  "acuerdoPatrocinio",
  "reporteResultados"
]);

const DOC_STATUS_ORDER = {
  NO_APLICA: 0,
  BLOQUEADO: 1,
  PENDIENTE: 2,
  TIENE: 3
};

const DOCENTE_STATUS_ORDER = {
  ACTIVO: 2,
  SALIO: 1,
  RENUNCIO: 0
};

function normText(v){
  return String(v == null ? "" : v).trim().replace(/\s+/g, " ");
}

function normalizeToken(value){
  return normText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function normalizeDocStatus(value, fallback, allowBlocked){
  // Comentario técnico:
  // el estado interno ya no puede depender de booleanos.
  // Aquí aceptamos compatibilidad con valores viejos (true/false)
  // y con estados nuevos guardados como texto o emoji.
  if (typeof value === "boolean"){
    return value ? "TIENE" : fallback;
  }

  const token = normalizeToken(value);
  if (!token) return fallback;

  if (token === "✅" || token === "TIENE" || token === "SI" || token === "TRUE"){
    return "TIENE";
  }

  if (token === "⏳" || token === "PENDIENTE"){
    return "PENDIENTE";
  }

  if (token === "⛔" || token === "NO_APLICA"){
    return "NO_APLICA";
  }

  if (allowBlocked && (token === "🔒" || token === "BLOQUEADO" || token === "NO_HABILITADO")){
    return "BLOQUEADO";
  }

  return fallback;
}

function normalizeDocenteStatus(value){
  // Comentario técnico:
  // estadoDocente se mantiene como código estable para que la UI
  // luego lo pinte con emoji sin perder consistencia al ordenar/exportar.
  const token = normalizeToken(value);
  if (!token) return "ACTIVO";

  if (token === "🟢" || token === "ACTIVO"){
    return "ACTIVO";
  }

  if (token === "🚪" || token === "SALIO" || token === "SALIDA" || token === "YA_SALIO" || token === "INACTIVO"){
    return "SALIO";
  }

  if (token === "📝" || token === "RENUNCIO" || token === "RENUNCIA"){
    return "RENUNCIO";
  }

  return "ACTIVO";
}

function getDocenteById(docenteId){
  const id = String(docenteId || "");
  return (Array.isArray(S.docentes) ? S.docentes : []).find((d) => String(d && d.id) === id) || null;
}

function getPeriodoLabelActual(){
  if (S.periodoLabel && S.periodoLabel !== "todos"){
    return String(S.periodoLabel);
  }

  if (S.capId){
    const cap = (Array.isArray(S.caps) ? S.caps : []).find(
      (c) => String(c && c.id) === String(S.capId)
    );
    if (cap && cap.periodoLabel){
      return String(cap.periodoLabel);
    }
  }

  return "";
}

function getPeriodoKey(){
  const label = getPeriodoLabelActual();
  if (!label) return "";

  const cfg = window.CTR && window.CTR.Config;
  const list = (cfg && typeof cfg.getPeriodos === "function") ? cfg.getPeriodos() : [];
  const found = list.find((p) => String(p && p.label) === label);

  return (found && found.id) ? String(found.id) : "";
}

function buildBaseState(docente){
  const baseChecklist = getBaseChecklist(docente, S.capId, getPeriodoKey());

  return {
    nombres: normText(docente && docente.nombres),
    apellidos: normText(docente && docente.apellidos),

    // Comentario técnico:
    // desde aquí el módulo trabaja con estados reales.
    // Esto evita que el flujo interno vuelva a convertir todo a true/false.
    estadoDocente: normalizeDocenteStatus(baseChecklist.estadoDocente),
    planIndividual: normalizeDocStatus(baseChecklist.planIndividual, "PENDIENTE", false),
    acuerdoPatrocinio: normalizeDocStatus(baseChecklist.acuerdoPatrocinio, "PENDIENTE", true),
    reporteResultados: normalizeDocStatus(baseChecklist.reporteResultados, "PENDIENTE", true)
  };
}

function getCurrentState(docente){
  const base = buildBaseState(docente);
  const over = S.pending.get(docente.id);
  return {
    base,
    curr: over ? { ...base, ...over } : { ...base }
  };
}

function isSameIdentity(state, docente){
  return (
    normText(state && state.nombres) === normText(docente && docente.nombres) &&
    normText(state && state.apellidos) === normText(docente && docente.apellidos)
  );
}

function syncPending(docente, nextState){
  const base = buildBaseState(docente);
  const normalized = {
    nombres: normText(nextState && nextState.nombres) || normText(docente && docente.nombres),
    apellidos: normText(nextState && nextState.apellidos) || normText(docente && docente.apellidos),
    estadoDocente: normalizeDocenteStatus(nextState && nextState.estadoDocente),
    planIndividual: normalizeDocStatus(nextState && nextState.planIndividual, "PENDIENTE", false),
    acuerdoPatrocinio: normalizeDocStatus(nextState && nextState.acuerdoPatrocinio, "PENDIENTE", true),
    reporteResultados: normalizeDocStatus(nextState && nextState.reporteResultados, "PENDIENTE", true)
  };

  const noChecklistChanges = sameChecklist(normalized, base);
  const noIdentityChanges = isSameIdentity(normalized, docente);

  if (noChecklistChanges && noIdentityChanges){
    S.pending.delete(docente.id);
    return;
  }

  S.pending.set(docente.id, normalized);
}

function getResolvedState(docente){
  const base = buildBaseState(docente);
  const over = S.pending.get(docente.id);
  return over ? { ...base, ...over } : { ...base };
}

function compareText(a, b){
  return String(a || "").localeCompare(String(b || ""), "es", {
    sensitivity: "base",
    numeric: true
  });
}

function compareStatus(a, b, field){
  const av = String(a || "");
  const bv = String(b || "");

  if (field === "estadoDocente"){
    return (DOCENTE_STATUS_ORDER[av] ?? -1) - (DOCENTE_STATUS_ORDER[bv] ?? -1);
  }

  return (DOC_STATUS_ORDER[av] ?? -1) - (DOC_STATUS_ORDER[bv] ?? -1);
}

function compareCedula(a, b){
  const aa = String(a || "");
  const bb = String(b || "");
  return aa.localeCompare(bb, "es", { numeric: true, sensitivity: "base" });
}

function getSortValue(row, field){
  const original = getDocenteById(row && row.id) || row;
  const state = getResolvedState(original);

  switch (field){
    case "nombres":
      return normText(state.nombres || original.nombres);
    case "apellidos":
      return normText(state.apellidos || original.apellidos);
    case "cedula":
      return String(original && original.cedula || "");
    case "estadoDocente":
      return normalizeDocenteStatus(state.estadoDocente);
    case "planIndividual":
      return normalizeDocStatus(state.planIndividual, "PENDIENTE", false);
    case "acuerdoPatrocinio":
      return normalizeDocStatus(state.acuerdoPatrocinio, "PENDIENTE", true);
    case "reporteResultados":
      return normalizeDocStatus(state.reporteResultados, "PENDIENTE", true);
    default:
      return normText(state.apellidos || original.apellidos);
  }
}

function defaultDirForField(field){
  return STATUS_FIELDS.has(field) ? "desc" : "asc";
}

function sortRows(rows){
  const list = Array.isArray(rows) ? [...rows] : [];
  const field = String(S.sortField || "apellidos");
  const dir = String(S.sortDir || "asc");

  list.sort((a, b) => {
    const va = getSortValue(a, field);
    const vb = getSortValue(b, field);

    let cmp = 0;

    if (field === "cedula"){
      cmp = compareCedula(va, vb);
    } else if (STATUS_FIELDS.has(field)){
      cmp = compareStatus(va, vb, field);
    } else {
      cmp = compareText(va, vb);
    }

    if (cmp === 0){
      const aa = getSortValue(a, "apellidos");
      const ab = getSortValue(b, "apellidos");
      const fallback = compareText(aa, ab);
      if (fallback !== 0) return fallback;

      const na = getSortValue(a, "nombres");
      const nb = getSortValue(b, "nombres");
      return compareText(na, nb);
    }

    return dir === "desc" ? (cmp * -1) : cmp;
  });

  return list;
}

function buildViewDocentes(){
  const merged = (Array.isArray(S.docentes) ? S.docentes : []).map((d) => {
    const over = S.pending.get(d.id);
    if (!over) return d;

    return {
      ...d,
      nombres: normText(over.nombres) || normText(d.nombres),
      apellidos: normText(over.apellidos) || normText(d.apellidos)
    };
  });

  const filtered = applySearch(merged, S.q);
  return sortRows(filtered);
}

function renderCounters(visibleCount){
  const loaded = Array.isArray(S.docentes) ? S.docentes.length : 0;
  const visible = Number(visibleCount == null ? loaded : visibleCount);
  const pend = S.pending.size;

  const t = $("ctrChipTotal");
  const p = $("ctrChipPend");
  const hasQ = !!String(S.q || "").trim();

  if (t){
    t.textContent = hasQ ? `Docentes: ${visible} / ${loaded}` : `Docentes: ${loaded}`;
  }
  if (p){
    p.textContent = `Pendientes: ${pend}`;
  }

  setFloatSave(pend, pend > 0);
}

async function loadCaps(){
  setMsg("Cargando capacitaciones…", "info");
  S.caps = await listarCapacitaciones(S.periodoLabel);
  setMsg("Capacitaciones cargadas.", "ok");
}

async function loadDocentes(){
  if (S.capId){
    setMsg("Cargando docentes…", "info");
    S.docentes = await listarDocentesPorCapacitacion(S.capId);
    setMsg("Docentes cargados.", "ok");
    return;
  }

  if (S.periodoLabel && S.periodoLabel !== "todos"){
    const capIds = buildCapIds(S.caps);
    setMsg("Cargando docentes del periodo…", "info");
    S.docentes = await listarDocentesPorCapIds(capIds);
    setMsg("Docentes cargados.", "ok");
    return;
  }

  S.docentes = [];
}

function rerender(){
  const view = buildViewDocentes();

  renderTable(
    $("ctrTableHost"),
    view,
    S.capId,
    S.pending,
    (doc, capId) => {
      const original = getDocenteById(doc && doc.id) || doc;
      return getBaseChecklist(original, capId, getPeriodoKey());
    },
    {
      field: S.sortField,
      dir: S.sortDir
    }
  );

  renderCounters(view.length);
}

function parseSortSelectValue(rawValue){
  const raw = String(rawValue || "").trim().toLowerCase();
  let field = "apellidos";
  let dir = raw.includes("desc") ? "desc" : "asc";

  if (raw.includes("nombre")) field = "nombres";
  else if (raw.includes("apellido")) field = "apellidos";
  else if (raw.includes("cedula")) field = "cedula";
  else if (raw.includes("docente") || raw.includes("estado")) field = "estadoDocente";
  else if (raw.includes("plan")) field = "planIndividual";
  else if (raw.includes("acuerdo")) field = "acuerdoPatrocinio";
  else if (raw.includes("reporte")) field = "reporteResultados";

  return { field, dir };
}

function bindTools(){
  const q = $("ctrQ");
  const sort = $("ctrSort");
  const csv = $("ctrCsv");

  if (q){
    q.addEventListener("input", () => {
      S.q = q.value || "";
      rerender();
    });
  }

  if (sort){
    sort.addEventListener("change", () => {
      const parsed = parseSortSelectValue(sort.value);
      S.sortField = parsed.field;
      S.sortDir = parsed.dir;
      rerender();
    });
  }

  if (csv){
    csv.addEventListener("click", () => {
      const view = buildViewDocentes();

      const rows = view.map((d) => {
        const original = getDocenteById(d.id) || d;
        const state = getResolvedState(original);

        return {
          nombres: normText(state.nombres) || normText(d.nombres),
          apellidos: normText(state.apellidos) || normText(d.apellidos),
          cedula: d.cedula,

          // Comentario técnico:
          // el CSV ya debe exportar estados reales para no perder
          // información como NO_APLICA, BLOQUEADO, SALIO o RENUNCIO.
          estadoDocente: normalizeDocenteStatus(state.estadoDocente),
          planIndividual: normalizeDocStatus(state.planIndividual, "PENDIENTE", false),
          acuerdoPatrocinio: S.capId
            ? normalizeDocStatus(state.acuerdoPatrocinio, "PENDIENTE", true)
            : null,
          reporteResultados: normalizeDocStatus(state.reporteResultados, "PENDIENTE", true)
        };
      });

      const periodo = String(S.periodoLabel || "todos")
        .replaceAll("/", "-")
        .replaceAll(" ", "");
      const cap = S.capId ? String(S.capId) : "periodo";

      exportCsv(`ctr_${periodo}_${cap}.csv`, rows);
    });
  }
}

async function start(){
  try{
    renderPeriodos($("ctrPeriodo"), S.periodoLabel);
    await loadCaps();
    renderCaps($("ctrCap"), S.caps, S.capId);
    await loadDocentes();
    rerender();

    bindFilters({
      selPeriodo: $("ctrPeriodo"),
      selCap: $("ctrCap"),
      onPeriodoChange: async (periodoLabel) => {
        S.periodoLabel = periodoLabel || "todos";
        resetOnPeriodo(S);
        rerender();
        await loadCaps();
        renderCaps($("ctrCap"), S.caps, S.capId);
        await loadDocentes();
        rerender();
      },
      onCapChange: async (capId) => {
        S.capId = capId || "";
        resetOnCap(S);
        rerender();
        await loadDocentes();
        rerender();
      }
    });

    bindTableChanges($("ctrTableHost"), (evt) => {
      if (evt.type === "sort"){
        const key = String(evt.key || "");
        if (!key) return;

        if (S.sortField === key){
          S.sortDir = S.sortDir === "asc" ? "desc" : "asc";
        } else {
          S.sortField = key;
          S.sortDir = defaultDirForField(key);
        }

        rerender();
        return;
      }

      const docente = getDocenteById(evt && evt.docenteId);
      if (!docente) return;

      const { curr } = getCurrentState(docente);

      if (evt.type === "checkbox"){
        // Comentario técnico:
        // mantenemos compatibilidad con la tabla actual de checkboxes.
        // Un check activo equivale a TIENE; sin check queda PENDIENTE.
        if (evt.key === "planIndividual"){
          curr.planIndividual = evt.checked ? "TIENE" : "PENDIENTE";
        } else if (evt.key === "acuerdoPatrocinio"){
          curr.acuerdoPatrocinio = evt.checked ? "TIENE" : "PENDIENTE";
        } else if (evt.key === "reporteResultados"){
          curr.reporteResultados = evt.checked ? "TIENE" : "PENDIENTE";
        }

        syncPending(docente, curr);
        rerender();
        return;
      }

      if (evt.type === "status"){
        // Comentario técnico:
        // dejamos listo el flujo para la siguiente tabla basada en estados
        // sin depender ya del checkbox binario.
        if (evt.key === "estadoDocente"){
          curr.estadoDocente = normalizeDocenteStatus(evt.value);
        } else if (evt.key === "planIndividual"){
          curr.planIndividual = normalizeDocStatus(evt.value, "PENDIENTE", false);
        } else if (evt.key === "acuerdoPatrocinio"){
          curr.acuerdoPatrocinio = normalizeDocStatus(evt.value, "PENDIENTE", true);
        } else if (evt.key === "reporteResultados"){
          curr.reporteResultados = normalizeDocStatus(evt.value, "PENDIENTE", true);
        } else {
          return;
        }

        syncPending(docente, curr);
        rerender();
        return;
      }

      if (evt.type === "text"){
        if (evt.key !== "nombres" && evt.key !== "apellidos") return;

        const fallback = normText(docente[evt.key]);
        curr[evt.key] = normText(evt.value) || fallback;

        syncPending(docente, curr);
        renderCounters(buildViewDocentes().length);
        return;
      }

      if (evt.type === "action"){
        if (evt.action === "swap-name"){
          const actualNombres = normText(curr.nombres) || normText(docente.nombres);
          const actualApellidos = normText(curr.apellidos) || normText(docente.apellidos);

          curr.nombres = actualApellidos;
          curr.apellidos = actualNombres;

          syncPending(docente, curr);
          rerender();
          return;
        }

        if (evt.action === "reset-name"){
          curr.nombres = normText(docente.nombres);
          curr.apellidos = normText(docente.apellidos);

          syncPending(docente, curr);
          rerender();
        }
      }
    });

    bindSave({
      btn: $("ctrSave"),
      getCapId: () => S.capId,
      getPeriodoKey: () => getPeriodoKey(),
      getPending: () => S.pending,
      setBusy: (on) => {
        setLocked(!!on, on ? "Guardando…" : "");
        setMsg(on ? "Guardando cambios…" : "Listo.", on ? "info" : "ok");
      },
      onSaved: async (savedCount) => {
        S.pending.clear();
        renderCounters(buildViewDocentes().length);
        setMsg(`Guardado correcto. (${Number(savedCount || 0)})`, "ok");
        await loadDocentes();
        rerender();
      },
      onError: (err) => {
        setMsg(String(err && err.message ? err.message : err), "err");
      }
    });

    bindTools();
  } catch (e){
    setMsg(String(e && e.message ? e.message : e), "err");
  }
}

window.addEventListener("DOMContentLoaded", start);