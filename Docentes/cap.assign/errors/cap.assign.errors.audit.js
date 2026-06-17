/* =========================================================
Nombre del archivo: cap.assign.errors.audit.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.audit.js
Función:
- runErrorsAudit({state}): audita inconsistencias BD + UI
========================================================= */

import { $ } from "../cap.assign.dom.js";
import { cleanSpaces } from "../cap.assign.utils.js";
import { groupBy, onlyDigits, str, isSet, hasSet, num } from "./cap.assign.errors.utils.js";

const LEVEL = { error: "error", warn: "warn", info: "info" };
const AREA  = { db: "db", ui: "ui" };
const TYPE  = {
  docente: "docente",
  carrera: "carrera",
  cap: "capacitacion",
  tabla: "tabla",
  pendientes: "pendientes"
};

function add(items, area, level, type, ref, message, suggestion, extra=null){
  items.push({
    area,
    level,
    type,
    ref: str(ref),
    message: str(message),
    suggestion: str(suggestion),
    extra
  });
}

function summarize(items){
  let errors=0, warnings=0, info=0;
  (items||[]).forEach(it => {
    if (it.level === LEVEL.error) errors++;
    else if (it.level === LEVEL.warn) warnings++;
    else info++;
  });
  return { errors, warnings, info, total: (items||[]).length };
}

function auditPendings(items, S, docentes){
  const docIds = new Set((docentes||[]).map(d => str(d && d.id)).filter(Boolean));

  if (!isSet(S.pendingAdd)) add(items, AREA.ui, LEVEL.error, TYPE.pendientes, "", "pendingAdd no es Set.", "Revisar state.");
  if (!isSet(S.pendingDel)) add(items, AREA.ui, LEVEL.error, TYPE.pendientes, "", "pendingDel no es Set.", "Revisar state.");

  if (isSet(S.pendingAdd)){
    for (const id of Array.from(S.pendingAdd)){
      if (id && !docIds.has(str(id))){
        add(items, AREA.ui, LEVEL.warn, TYPE.pendientes, str(id), "pendingAdd tiene id inexistente.", "Revisar masivo/selección.");
      }
    }
  }

  if (isSet(S.pendingDel)){
    for (const id of Array.from(S.pendingDel)){
      if (id && !docIds.has(str(id))){
        add(items, AREA.ui, LEVEL.warn, TYPE.pendientes, str(id), "pendingDel tiene id inexistente.", "Revisar masivo/selección.");
      }
    }
  }

  if (isSet(S.pendingAdd) && isSet(S.pendingDel)){
    for (const id of Array.from(S.pendingAdd)){
      if (S.pendingDel.has(id)){
        add(items, AREA.ui, LEVEL.error, TYPE.pendientes, str(id), "Mismo id en pendingAdd y pendingDel.", "Debe estar solo en uno.");
      }
    }
  }
}

export function runErrorsAudit({ state }){
  const S = (state && state.S) ? state.S : {
    carreras: [],
    docentes: [],
    capacitaciones: [],
    capSelectedId: "",
    carreraId: "",
    search: "",
    inout: "all",
    selectedDocIds: new Set(),
    pendingAdd: new Set(),
    pendingDel: new Set()
  };

  const carreras = Array.isArray(S.carreras) ? S.carreras : [];
  const docentes = Array.isArray(S.docentes) ? S.docentes : [];
  const caps     = Array.isArray(S.capacitaciones) ? S.capacitaciones : [];

  const byCarreraId = new Set(carreras.map(r => str(r && r.id)).filter(Boolean));
  const byCapId     = new Set(caps.map(c => str(c && c.id)).filter(Boolean));

  const items = [];
  const meta = {
    ts: new Date().toISOString(),
    counts: {
      carreras: carreras.length,
      docentes: docentes.length,
      caps: caps.length,
      tableRows: 0
    }
  };

  // BD: Carreras
  carreras.forEach((r, idx) => {
    const id = str(r && r.id);
    const nombre = str(r && (r.nombre || r.name));
    if (!id) add(items, AREA.db, LEVEL.error, TYPE.carrera, "", `Carrera sin id, índice ${idx}.`, "Asigna un id en Firestore.");
    if (id && !nombre) add(items, AREA.db, LEVEL.warn, TYPE.carrera, id, "Carrera sin nombre.", "Agrega campo nombre.");
  });

  // BD: Capacitaciones
  caps.forEach((c, idx) => {
    const id = str(c && c.id);
    const nombre = str(c && (c.nombre || c.name));
    if (!id) add(items, AREA.db, LEVEL.error, TYPE.cap, "", `Capacitación sin id, índice ${idx}.`, "Asigna un id en Firestore.");
    if (id && !nombre) add(items, AREA.db, LEVEL.warn, TYPE.cap, id, "Capacitación sin nombre.", "Agrega campo nombre.");
  });

  // BD: Docentes
  const seenCed = new Map();
  docentes.forEach((d, idx) => {
    const id = str(d && d.id);
    const cedula = onlyDigits(str(d && (d.cedula || d.id)));
    const nombre = cleanSpaces(str(d && d.nombre));
    const carreraId = str(d && d.carreraId);

    if (!id) add(items, AREA.db, LEVEL.error, TYPE.docente, "", `Docente sin id, índice ${idx}.`, "Usa id del doc en Firestore.");
    if (!cedula) add(items, AREA.db, LEVEL.error, TYPE.docente, id || `(índice ${idx})`, "Docente sin cédula válida.", "Agrega campo cedula o usa cédula como id.");

    if (cedula){
      const prev = seenCed.get(cedula);
      if (prev && prev !== id){
        add(items, AREA.db, LEVEL.error, TYPE.docente, id || cedula, `Cédula duplicada: ${cedula}.`, "Unifica duplicados o corrige cédula.");
      } else {
        seenCed.set(cedula, id || cedula);
      }
    }

    if (!nombre) add(items, AREA.db, LEVEL.warn, TYPE.docente, id || cedula || `(índice ${idx})`, "Docente sin nombre.", "Agrega campo nombre.");
    if (!carreraId) add(items, AREA.db, LEVEL.warn, TYPE.docente, id || cedula || `(índice ${idx})`, "Docente sin carreraId.", "Agrega carreraId.");
    else if (!byCarreraId.has(carreraId)){
      add(items, AREA.db, LEVEL.error, TYPE.docente, id || cedula || carreraId, `carreraId no existe: ${carreraId}.`, "Corrige carreraId o crea la carrera.");
    }

    const cc = d && d.capacitaciones;
    if (cc != null && !Array.isArray(cc)){
      add(items, AREA.db, LEVEL.error, TYPE.docente, id || cedula || `(índice ${idx})`, "capacitaciones no es array.", "Convierte a array.");
    }
    if (Array.isArray(cc)){
      cc.forEach((capIdRaw) => {
        const capId = str(capIdRaw);
        if (!capId) return;
        if (!byCapId.has(capId)){
          add(
            items,
            AREA.db,
            LEVEL.error,
            TYPE.docente,
            id || cedula || "",
            `Referencia a cap inexistente: ${capId}.`,
            "Puedes quitar la referencia inválida.",
            { badCapId: capId }
          );
        }
      });
    }
  });

  // UI: tabla
  const tableHost = $("docTableHost");
  if (!tableHost){
    add(items, AREA.ui, LEVEL.warn, TYPE.tabla, "", "No se encontró docTableHost.", "Verifica render de tabla.");
  } else {
    const rows = Array.from(tableHost.querySelectorAll("tbody tr"));
    meta.counts.tableRows = rows.length;

    const docById = new Map(docentes.map(d => [str(d && d.id), d]));
    const capSelectedId = str(S.capSelectedId);

    rows.forEach((tr, i) => {
      const rid = str(tr.getAttribute("data-id"));
      if (!rid){
        add(items, AREA.ui, LEVEL.error, TYPE.tabla, `fila ${i+1}`, "Fila sin data-id.", "En render, cada tr debe tener data-id.");
        return;
      }

      const d = docById.get(rid);
      if (!d){
        add(items, AREA.ui, LEVEL.error, TYPE.tabla, rid, "Fila muestra docente inexistente en state.", "Revisar render o recarga.");
      }

      const cb = tr.querySelector('input[type="checkbox"][data-sel]');
      const sel = cb ? str(cb.getAttribute("data-sel")) : "";
      if (!cb){
        add(items, AREA.ui, LEVEL.warn, TYPE.tabla, rid, "Fila sin checkbox de selección.", "Renderiza el checkbox.");
      } else if (sel !== rid){
        add(items, AREA.ui, LEVEL.error, TYPE.tabla, rid, `Checkbox data-sel no coincide: ${sel}.`, "data-sel debe ser igual al id.");
      }

      if (capSelectedId && d){
        const pill = tr.querySelector(".pill");
        const pillText = pill ? cleanSpaces(pill.textContent) : "";
        const capsArr = Array.isArray(d.capacitaciones) ? d.capacitaciones : [];
        const inDb = capsArr.includes(capSelectedId);

        const pendAdd = hasSet(S.pendingAdd, rid);
        const pendDel = hasSet(S.pendingDel, rid);

        let expected = inDb ? "EN" : "FUERA";
        if (pendAdd) expected = "EN";
        if (pendDel) expected = "FUERA";

        if (pill && pillText && pillText !== expected){
          add(items, AREA.ui, LEVEL.warn, TYPE.pendientes, rid, `Estado mostrado ${pillText} difiere de ${expected}.`, "Re-render recomendado.");
        }
      }
    });
  }

  auditPendings(items, S, docentes);

  const summary = summarize(items);
  return { meta, summary, items };
}
