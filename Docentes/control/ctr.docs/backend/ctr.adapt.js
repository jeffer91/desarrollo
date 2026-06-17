/* =========================================================
Nombre del archivo: ctr.adapt.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.adapt.js
Función o funciones:
- getBaseChecklist(doc, capId, periodoKey): normaliza checklist desde Firestore
- buildCapIds(caps): extrae ids únicos de capacitaciones (para modo periodo)
- sameChecklist(a,b): compara si hay cambios reales (para limpiar pendientes)
========================================================= */

function asObj(v){
  return (v && typeof v === "object") ? v : {};
}

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

function normalizeDocStatus(value, fallback, allowBlocked){
  // Comentario técnico:
  // este adaptador debe aceptar tanto datos antiguos booleanos
  // como los nuevos estados guardados en Firestore.
  // Así evitamos romper docentes ya registrados antes del cambio.
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
  // estadoDocente se expone como código estable para que
  // la capa siguiente decida si lo muestra como texto o emoji.
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

export function getBaseChecklist(doc, capId, periodoKey){
  const cd = asObj(doc && doc.controlDocs);
  const periodos = asObj(cd.periodos);
  const periodo = periodoKey ? asObj(periodos[String(periodoKey)]) : {};
  const acuerdos = asObj(cd.acuerdos);

  const planIndividual = normalizeDocStatus(
    periodo.planIndividual,
    "PENDIENTE",
    false
  );

  const acuerdoPatrocinio = capId
    ? normalizeDocStatus(acuerdos[String(capId)], "PENDIENTE", true)
    : "PENDIENTE";

  const reporteResultados = normalizeDocStatus(
    periodo.reporteResultados,
    "PENDIENTE",
    true
  );

  return {
    // Comentario técnico:
    // planIndividual y reporteResultados se leen por periodo activo
    // para evitar arrastrar estado entre periodos distintos.
    planIndividual,
    reporteResultados,

    // Comentario técnico:
    // estadoDocente queda por periodo para distinguir casos como
    // ACTIVO, SALIO o RENUNCIO dentro del ciclo evaluado.
    estadoDocente: normalizeDocenteStatus(periodo.estadoDocente),

    // POR CAPACITACIÓN (map por capId)
    acuerdoPatrocinio
  };
}

export function buildCapIds(caps){
  const list = Array.isArray(caps) ? caps : [];
  const set = new Set();
  list.forEach((c) => {
    if (c && c.id) set.add(String(c.id));
  });
  return Array.from(set);
}

export function sameChecklist(a, b){
  const A = a || {};
  const B = b || {};

  return (
    normalizeDocStatus(A.planIndividual, "PENDIENTE", false) ===
      normalizeDocStatus(B.planIndividual, "PENDIENTE", false) &&
    normalizeDocStatus(A.acuerdoPatrocinio, "PENDIENTE", true) ===
      normalizeDocStatus(B.acuerdoPatrocinio, "PENDIENTE", true) &&
    normalizeDocStatus(A.reporteResultados, "PENDIENTE", true) ===
      normalizeDocStatus(B.reporteResultados, "PENDIENTE", true) &&
    normalizeDocenteStatus(A.estadoDocente) ===
      normalizeDocenteStatus(B.estadoDocente)
  );
}