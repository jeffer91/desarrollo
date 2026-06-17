/* =========================================================
Nombre del archivo: ctr.repo.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.repo.js
Función o funciones:
- listarCapacitaciones(periodoLabel)
- listarDocentesPorCapacitacion(capId)
- listarDocentesPorCapIds(capIds) // modo periodo (array-contains-any en chunks)
- guardarChecklist(capIdOpcional, periodoKey, rows)
  // guarda plan/reporte por periodo; acuerdo por cap;
  // además guarda nombres y apellidos corregidos en /docentes/{id}
========================================================= */
import { getDb } from "./ctr.firebase.js";

function asText(v){
  return String(v == null ? "" : v).trim();
}

function normalizeToken(value){
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function asDocStatus(value, fallback, allowBlocked){
  // Comentario técnico:
  // este repositorio ya no debe aplastar estados a true/false.
  // Normaliza lo que venga desde UI (booleano, texto o emoji) y
  // persiste un código estable para Firestore.
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

function asDocenteStatus(value){
  // Comentario técnico:
  // estadoDocente se guarda como código, no como emoji.
  // Así luego se puede filtrar, exportar y renderizar sin ambigüedad.
  const token = normalizeToken(value);
  if (!token) return "";

  if (token === "🟢" || token === "ACTIVO"){
    return "ACTIVO";
  }

  if (token === "🚪" || token === "SALIO" || token === "SALIDA" || token === "YA_SALIO" || token === "INACTIVO"){
    return "SALIO";
  }

  if (token === "📝" || token === "RENUNCIO" || token === "RENUNCIA"){
    return "RENUNCIO";
  }

  return "";
}

function padMonth(value){
  const n = String(value || "").replace(/[^\d]/g, "");
  if (!n) return "";
  return n.padStart(2, "0").slice(-2);
}

function toYear(value){
  const n = String(value || "").replace(/[^\d]/g, "");
  if (!n) return "";
  return n.slice(0, 4);
}

function getYearMonthValue(anio, mes){
  const y = Number(toYear(anio));
  const m = Number(padMonth(mes));
  if (!y || !m) return 0;
  return Number(`${y}${String(m).padStart(2, "0")}`);
}

function normalizarPeriodo(raw){
  const src = raw || {};
  const mesIni = padMonth(src.mesIni || src.mesInicio || "");
  const anioIni = toYear(src.anioIni || src.anioInicio || "");
  const mesFin = padMonth(src.mesFin || src.mesFinal || src.mesHasta || "");
  const anioFin = toYear(src.anioFin || src.anioFinal || src.anioHasta || "");

  let periodoLabel = asText(src.periodoLabel);

  // Comentario técnico:
  // algunas capacitaciones no traen periodoLabel directo y lo forman con
  // mes/anio de inicio-fin. Aquí normalizamos ambos esquemas.
  if (!periodoLabel && mesIni && anioIni && mesFin && anioFin){
    periodoLabel = `${mesIni}/${anioIni} - ${mesFin}/${anioFin}`;
  } else if (!periodoLabel && mesIni && anioIni){
    periodoLabel = `${mesIni}/${anioIni}`;
  }

  return {
    mesIni,
    anioIni,
    mesFin,
    anioFin,
    periodoLabel
  };
}

function getPeriodoLabelOficial(data, fallbackLabel){
  const cfg = window.CTR && window.CTR.Config ? window.CTR.Config : null;
  const periodos = cfg && typeof cfg.getPeriodos === "function" ? cfg.getPeriodos() : [];

  // Comentario técnico:
  // el selector superior trabaja con períodos oficiales del módulo.
  // una capacitación puede venir con un rango real como 03/2026 - 04/2026,
  // pero si su inicio cae en 03/2026 debe mostrarse dentro del período oficial
  // 10/2025 - 03/2026.
  let ym = 0;

  const fechaInicio = asText(data && data.fechaInicio);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)){
    ym = Number(fechaInicio.slice(0, 4) + fechaInicio.slice(5, 7));
  }

  if (!ym){
    ym = getYearMonthValue(
      data && data.periodo ? data.periodo.anioIni : data && data.anioIni,
      data && data.periodo ? data.periodo.mesIni : data && data.mesIni
    );
  }

  if (!ym || !Array.isArray(periodos) || !periodos.length){
    return asText(fallbackLabel);
  }

  const found = periodos.find((p) => {
    const id = asText(p && p.id);
    const parts = id.split("_");
    if (parts.length !== 2) return false;

    const ini = parts[0].split("-");
    const fin = parts[1].split("-");
    if (ini.length !== 2 || fin.length !== 2) return false;

    const from = getYearMonthValue(ini[0], ini[1]);
    const to = getYearMonthValue(fin[0], fin[1]);

    return from && to && ym >= from && ym <= to;
  });

  return asText(found && found.label) || asText(fallbackLabel);
}

// --------------------
// CAPACITACIONES
// --------------------
export async function listarCapacitaciones(periodoLabel){
  const db = await getDb();
  const { collection, getDocs } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  const useAll = !periodoLabel || periodoLabel === "todos";
  const snap = await getDocs(collection(db, "capacitaciones"));
  const rows = [];

  snap.forEach((d) => {
    const data = d.data() || {};
    const periodo = normalizarPeriodo(
      data.periodo || {
        mesIni: data.mesIni,
        anioIni: data.anioIni,
        mesFin: data.mesFin,
        anioFin: data.anioFin,
        periodoLabel: data.periodoLabel
      }
    );

    const periodoOficial = getPeriodoLabelOficial(data, periodo.periodoLabel);

    // Comentario técnico:
    // el filtro ya no depende del periodoLabel literal del documento,
    // sino del período oficial al que pertenece la capacitación.
    if (!useAll && periodoOficial !== String(periodoLabel)) return;

    rows.push({
      id: d.id,
      nombre: asText(data.nombre || data.titulo || d.id),
      periodoLabel: periodoOficial
    });
  });

  rows.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return rows;
}

// --------------------
// DOCENTES (por cap única)
// --------------------
export async function listarDocentesPorCapacitacion(capId){
  const db = await getDb();
  const { collection, getDocs, query, where } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  if (!capId) return [];

  const q = query(
    collection(db, "docentes"),
    where("capacitaciones", "array-contains", String(capId))
  );

  const snap = await getDocs(q);
  const rows = [];

  snap.forEach((d) => {
    const data = d.data() || {};
    rows.push({
      id: d.id,
      cedula: asText(data.cedula) || d.id,
      nombres: asText(data.nombres),
      apellidos: asText(data.apellidos),
      controlDocs: (data.controlDocs && typeof data.controlDocs === "object")
        ? data.controlDocs
        : {}
    });
  });

  rows.sort((a, b) => {
    return (a.apellidos + " " + a.nombres).localeCompare(
      b.apellidos + " " + b.nombres,
      "es"
    );
  });

  return rows;
}

// --------------------
// DOCENTES (por múltiples capIds del periodo)
// --------------------
export async function listarDocentesPorCapIds(capIds){
  const db = await getDb();
  const { collection, getDocs, query, where } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  const ids = Array.isArray(capIds) ? capIds.map(String).filter(Boolean) : [];
  if (!ids.length) return [];

  // Firestore: array-contains-any permite máximo 10 valores.
  const CHUNK = 10;
  const byId = new Map();

  for (let i = 0; i < ids.length; i += CHUNK){
    const slice = ids.slice(i, i + CHUNK);
    const q = query(
      collection(db, "docentes"),
      where("capacitaciones", "array-contains-any", slice)
    );

    const snap = await getDocs(q);
    snap.forEach((d) => {
      if (byId.has(d.id)) return;

      const data = d.data() || {};
      byId.set(d.id, {
        id: d.id,
        cedula: asText(data.cedula) || d.id,
        nombres: asText(data.nombres),
        apellidos: asText(data.apellidos),
        controlDocs: (data.controlDocs && typeof data.controlDocs === "object")
          ? data.controlDocs
          : {}
      });
    });
  }

  const rows = Array.from(byId.values());
  rows.sort((a, b) => {
    return (a.apellidos + " " + a.nombres).localeCompare(
      b.apellidos + " " + b.nombres,
      "es"
    );
  });

  return rows;
}

// --------------------
// GUARDADO CHECKLIST + IDENTIDAD
// --------------------
export async function guardarChecklist(capId, periodoKey, rows){
  const db = await getDb();
  const { doc, writeBatch } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  const list = Array.isArray(rows) ? rows : [];
  const safeCap = asText(capId);       // puede venir vacío (modo periodo)
  const safePeriodo = asText(periodoKey); // obligatorio para plan/reporte

  if (!list.length) return { ok: true, saved: 0 };

  if (!safePeriodo){
    throw new Error("Periodo inválido para guardar checklist.");
  }

  // Comentario técnico:
  // - batch límite 500. Usamos 450 por margen.
  // - merge:true para conservar otros campos del docente.
  const CHUNK = 450;
  let saved = 0;

  for (let i = 0; i < list.length; i += CHUNK){
    const batch = writeBatch(db);
    const slice = list.slice(i, i + CHUNK);

    slice.forEach((r) => {
      const docenteId = asText(r && r.docenteId);
      if (!docenteId) return;

      const ref = doc(db, "docentes", docenteId);

      const planStatus = asDocStatus(
        r && r.planIndividual,
        "PENDIENTE",
        false
      );

      const reporteStatus = asDocStatus(
        r && r.reporteResultados,
        "PENDIENTE",
        true
      );

      const payload = {
        controlDocs: {
          periodos: {
            [safePeriodo]: {
              // Comentario técnico:
              // planIndividual y reporteResultados ya no se guardan como booleanos.
              // Esto evita perder estados como NO_APLICA o BLOQUEADO.
              planIndividual: planStatus,
              reporteResultados: reporteStatus
            }
          }
        },
        updatedAt: new Date().toISOString()
      };

      if (safeCap){
        const acuerdoStatus = asDocStatus(
          r && r.acuerdoPatrocinio,
          "PENDIENTE",
          true
        );

        // Comentario técnico:
        // acuerdoPatrocinio se guarda por capacitación seleccionada
        // y también persiste estado, no solo marcado/no marcado.
        payload.controlDocs.acuerdos = {
          [safeCap]: acuerdoStatus
        };
      }

      const estadoDocente = asDocenteStatus(r && r.estadoDocente);
      if (estadoDocente){
        // Comentario técnico:
        // el estado del docente se guarda por período para poder distinguir
        // casos como ACTIVO, SALIO o RENUNCIO dentro del ciclo evaluado.
        payload.controlDocs.periodos[safePeriodo].estadoDocente = estadoDocente;
      }

      const nombres = asText(r && r.nombres);
      const apellidos = asText(r && r.apellidos);

      // Comentario técnico:
      // solo escribimos nombres/apellidos si vienen con valor válido.
      if (nombres) payload.nombres = nombres;
      if (apellidos) payload.apellidos = apellidos;

      batch.set(ref, payload, { merge: true });
      saved++;
    });

    await batch.commit();
  }

  return { ok: true, saved };
}