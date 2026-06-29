/* =========================================================
Nombre completo: bl-filtros.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-filtros.js
Función:
- Filtrar estudiantes por período, estado, división y búsqueda.
- Evitar normalizar toda la base en cada búsqueda o conteo.
- Mantener compatibilidad con BLNormalizador cuando un registro todavía no está normalizado.
========================================================= */
(function(window){
  "use strict";

  var normalCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function campos(){if(!window.BLCampos){throw new Error("BLCampos no disponible.");}return window.BLCampos;}
  function normalizador(){if(!window.BLNormalizador){throw new Error("BLNormalizador no disponible.");}return window.BLNormalizador;}
  function text(value){return campos().text(value);}
  function normalizeSearch(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();}

  function normalizeOne(row, index){
    if(!row || typeof row !== "object"){return normalizador().normalizeStudent(row || {}, index || 0);}
    if(row.__blFiltroNormalizado === true || row._bl2Id || row.cedula || row.numeroIdentificacion){return row;}
    if(normalCache && normalCache.has(row)){return normalCache.get(row);}
    var normalized = normalizador().normalizeStudent(row, index || 0);
    try{Object.defineProperty(normalized,"__blFiltroNormalizado",{value:true,enumerable:false});}catch(error){normalized.__blFiltroNormalizado = true;}
    if(normalCache){normalCache.set(row, normalized);}
    return normalized;
  }

  function buildSearchText(student){
    student = normalizeOne(student, 0);
    var parts = [];
    campos().searchCanonicalFields.forEach(function(field){parts.push(campos().getValue(student, field, ""));});
    parts.push(student && student._bl2Search);
    parts.push(student && student.division);
    parts.push(Array.isArray(student && student.divisiones) ? student.divisiones.join(" ") : "");
    return normalizeSearch(parts.join(" "));
  }

  function samePeriod(a, b){
    if(!text(b)){return true;}
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){return window.BLPeriodosCanon.samePeriod(a, b);}
    return text(a) === text(b) || normalizeSearch(a) === normalizeSearch(b);
  }

  function periodOf(student){return student.periodoId || student.ultimoPeriodoId || student.periodoLabel || student.periodo || student._bl2PeriodoId || student._bl2Periodo || campos().getValue(student,"periodoId","");}
  function matchPeriod(student, periodId){var wanted = text(periodId);return !wanted || samePeriod(periodOf(student), wanted);}
  function matchStatus(student, statusFilter){var wanted = text(statusFilter);if(wanted === ""){return true;}var estado = campos().normalizeEstado(campos().getValue(student,"estadoMatricula",student.estadoMatricula || student._bl2EstadoMatricula || "ACTIVO"));return estado === wanted;}
  function matchDivision(student, division){
    var wanted = text(division || "");
    if(!wanted){return true;}
    if(window.BLDivisionesService && typeof window.BLDivisionesService.hasDivision === "function"){return window.BLDivisionesService.hasDivision(student, wanted);}
    var list = normalizador().normalizeDivisiones(student && (student.divisiones || student.division || student._bl2Division));
    var current = list[0] || "Sin división";
    return normalizeSearch(current) === normalizeSearch(wanted);
  }
  function matchSearch(student, search){var wanted = normalizeSearch(search);return !wanted || buildSearchText(student).indexOf(wanted) >= 0;}

  function filterStudents(rows, options){
    options = options || {};
    var statusFilter = options.estadoMatricula;
    if(statusFilter == null){statusFilter = "ACTIVO";}
    var result = [];
    (Array.isArray(rows) ? rows : []).forEach(function(row, index){
      var student = normalizeOne(row, index);
      if(matchPeriod(student, options.periodoId || "") && matchStatus(student, statusFilter) && matchDivision(student, options.division || options.divisionNombre || "") && matchSearch(student, options.search || "")){result.push(student);}
    });
    return result;
  }

  function countByStatus(rows){
    var counts = {ACTIVO:0, RETIRADO:0, TOTAL:0};
    (Array.isArray(rows) ? rows : []).forEach(function(row, index){
      var student = normalizeOne(row, index);
      var estado = campos().normalizeEstado(campos().getValue(student,"estadoMatricula",student.estadoMatricula || student._bl2EstadoMatricula || "ACTIVO"));
      counts[estado] = (counts[estado] || 0) + 1;
      counts.TOTAL += 1;
    });
    return counts;
  }

  function uniqueCareers(rows){
    var map = {};
    (Array.isArray(rows) ? rows : []).forEach(function(row, index){
      var student = normalizeOne(row, index);
      var carrera = text(campos().getValue(student,"nombreCarrera",student.nombrecarrera || student.NombreCarrera || student._bl2Carrera || student.carrera || "SIN CARRERA"));
      map[carrera || "SIN CARRERA"] = true;
    });
    return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});
  }

  function uniqueDivisions(rows){
    if(window.BLDivisionesService && typeof window.BLDivisionesService.listDivisionsWithEmpty === "function"){return window.BLDivisionesService.listDivisionsWithEmpty(rows || [], "");}
    var map = {};
    (Array.isArray(rows) ? rows : []).forEach(function(row, index){
      var student = normalizeOne(row, index);
      var list = normalizador().normalizeDivisiones(student.divisiones || student.division || student._bl2Division);
      map[list[0] || "Sin división"] = true;
    });
    return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});
  }

  window.BLFiltros = {normalizeSearch:normalizeSearch,buildSearchText:buildSearchText,filterStudents:filterStudents,countByStatus:countByStatus,uniqueCareers:uniqueCareers,uniqueDivisions:uniqueDivisions,matchDivision:matchDivision,normalizeOne:normalizeOne};
})(window);
