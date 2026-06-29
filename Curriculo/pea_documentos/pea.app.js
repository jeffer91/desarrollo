/*
Nombre del archivo: pea.app.js
Ubicación: /Curriculo/pea_documentos/pea.app.js
Función:
- Controlar pantalla PEA documentos
- Cargar carreras y materias local-first
- Guardar versiones PEA en local
- Usar carga inteligente por arrastre para 1 Excel consolidado o 3 Excel
- Cargar historial, comparar, exportar y sincronizar
*/
(function (window, document) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  var state = {
    carreraId: "",
    materiaId: "",
    versions: [],
    currentVersion: null,
    currentComparison: null,
    carreras: [],
    materias: []
  };

  function el(id) { return document.getElementById(id); }
  function has(id) { return !!el(id); }
  function clean(value) { return PEA.parser && PEA.parser.cleanText ? PEA.parser.cleanText(value) : String(value || "").replace(/\s+/g, " ").trim(); }
  function esc(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

  function setStatus(message, type) {
    var node = el("peaStatus");
    if (!node) return;
    node.textContent = String(message || "");
    node.classList.remove("is-ok", "is-error", "is-warn");
    if (type === "ok") node.classList.add("is-ok");
    else if (type === "error") node.classList.add("is-error");
    else if (type === "warn") node.classList.add("is-warn");
  }

  function setSyncText() {
    var node = el("peaSyncStatus");
    var pending = PEA.store && PEA.store.countPendingLocal ? PEA.store.countPendingLocal() : 0;
    if (!node) return;
    node.textContent = pending ? "Pendientes PEA por subir: " + pending : "PEA local sincronizado o sin pendientes.";
    node.setAttribute("data-pending", String(pending));
  }

  function mode() {
    var checked = document.querySelector('input[name="peaModoCarga"]:checked');
    return checked ? String(checked.value || "triple") : "triple";
  }

  function toggleMode() {
    var m = mode();
    if (el("peaCargaTriple")) el("peaCargaTriple").classList.toggle("pea-hidden", m !== "triple");
    if (el("peaCargaConsolidado")) el("peaCargaConsolidado").classList.toggle("pea-hidden", m === "triple");
  }

  function getCarrera(id) {
    id = clean(id);
    return state.carreras.find(function (item) { return String(item.id || "") === id; }) || null;
  }

  function getMateria(id) {
    id = clean(id);
    return state.materias.find(function (item) { return String(item.id || "") === id; }) || null;
  }

  function uniqueSorted(list) {
    var seen = Object.create(null);
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      var text = clean(item);
      var key = text.toLowerCase();
      if (text && !seen[key]) {
        seen[key] = true;
        out.push(text);
      }
    });
    return out.sort(function (a, b) { return a.localeCompare(b, "es", { sensitivity: "base", numeric: true }); });
  }

  function materiaId(carreraId, nombre) {
    if (PEA.store && typeof PEA.store.createMateriaId === "function") return PEA.store.createMateriaId(carreraId, nombre);
    return String(carreraId || "") + "__" + (PEA.parser && PEA.parser.slugify ? PEA.parser.slugify(nombre) : clean(nombre).toLowerCase().replace(/\s+/g, "_"));
  }

  function fillSelect(select, options, placeholder) {
    if (!select) return;
    select.innerHTML = '<option value="">' + esc(placeholder || "Seleccione") + '</option>' + (options || []).map(function (item) {
      return '<option value="' + esc(item.id) + '">' + esc(item.nombre || item.id) + '</option>';
    }).join("");
  }

  async function loadCarreras() {
    var select = el("peaCarreraSelect");
    if (!PEA.store || typeof PEA.store.listCarrerasForSelect !== "function") throw new Error("PEA.store.listCarrerasForSelect no está disponible.");
    state.carreras = await PEA.store.listCarrerasForSelect();
    fillSelect(select, state.carreras, "Selecciona una carrera");
    setStatus(state.carreras.length ? "Carreras cargadas: " + state.carreras.length : "No hay carreras disponibles.", state.carreras.length ? "ok" : "warn");
  }

  async function loadMaterias(carreraId) {
    var materiaSelect = el("peaMateriaSelect");
    var tipoInput = el("peaMateriaTipo");
    var carrera = getCarrera(carreraId);
    var doc;
    var materias;

    state.materias = [];
    state.materiaId = "";
    fillSelect(materiaSelect, [], "Selecciona una materia");
    if (tipoInput) tipoInput.value = carrera ? String(carrera.tipo || "") : "";
    if (!carrera) return;

    if (!PEA.store || typeof PEA.store.readCarreraLocalFirst !== "function") throw new Error("No se puede leer la carrera seleccionada.");
    doc = await PEA.store.readCarreraLocalFirst(carrera.id);
    if (!doc) throw new Error("No se encontró la carrera seleccionada.");

    materias = []
      .concat(Array.isArray(doc.materiasNivel1) ? doc.materiasNivel1 : [])
      .concat(Array.isArray(doc.materiasNivel2) ? doc.materiasNivel2 : [])
      .concat(Array.isArray(doc.materiasNivel3) ? doc.materiasNivel3 : [])
      .concat(Array.isArray(doc.materiasNivel4) ? doc.materiasNivel4 : [])
      .concat(Array.isArray(doc.materiasTransversal1) ? doc.materiasTransversal1 : [])
      .concat(Array.isArray(doc.materiasTransversal2) ? doc.materiasTransversal2 : [])
      .concat(Array.isArray(doc.materiasTransversal3) ? doc.materiasTransversal3 : [])
      .concat(Array.isArray(doc.materiasTransversal4) ? doc.materiasTransversal4 : []);

    state.carreraId = carrera.id;
    state.materias = uniqueSorted(materias).map(function (nombre) {
      return { id: materiaId(carrera.id, nombre), nombre: nombre, carreraId: carrera.id, carreraNombre: carrera.nombre, carreraTipo: carrera.tipo };
    });
    fillSelect(materiaSelect, state.materias, "Selecciona una materia");
    setStatus("Materias cargadas: " + state.materias.length, state.materias.length ? "ok" : "warn");
  }

  function updateMeta() {
    var carrera = getCarrera(has("peaCarreraSelect") ? el("peaCarreraSelect").value : "");
    var materia = getMateria(has("peaMateriaSelect") ? el("peaMateriaSelect").value : "");
    state.carreraId = carrera ? carrera.id : "";
    state.materiaId = materia ? materia.id : "";
    if (el("peaMateriaTipo")) el("peaMateriaTipo").value = carrera ? String(carrera.tipo || "") : "";
  }

  function selectedMateriaData() {
    var carrera = getCarrera(has("peaCarreraSelect") ? el("peaCarreraSelect").value : "");
    var materia = getMateria(has("peaMateriaSelect") ? el("peaMateriaSelect").value : "");
    if (!carrera) throw new Error("Debes seleccionar una carrera.");
    if (!materia) throw new Error("Debes seleccionar una materia.");
    return { carreraId: carrera.id, carreraNombre: carrera.nombre, materiaId: materia.id, materiaNombre: materia.nombre, materiaCodigo: materia.id, materiaTipo: carrera.tipo };
  }

  function sectionInfo(section) {
    var sheets = section && Array.isArray(section.sheets) ? section.sheets : [];
    if (!sheets.length) return "Sin hojas registradas.";
    return sheets.map(function (sheet) { return "- " + String(sheet.name || "Hoja") + " | filas: " + Number(sheet.rowCount || 0); }).join("\n");
  }

  function buildPreviewHtml(versionData) {
    if (!versionData || !versionData.meta || !versionData.data) return "No hay datos para mostrar.";
    var meta = versionData.meta;
    var data = versionData.data;
    var content = data.contenido || {};
    return [
      '<div class="pea-preview-block"><div class="pea-preview-title">' + esc(meta.materiaNombre || "") + " · " + esc(meta.versionId || "") + '</div><div class="pea-preview-lines">' + esc("Carrera: " + (meta.carreraNombre || data.carreraNombre || "") + "\nOrigen: " + (meta.origenTipo || "") + "\nFecha: " + (meta.createdAtClient || "") + "\nNota: " + (meta.versionNota || "Sin nota") + "\nSincronizado: " + (meta.synced ? "Sí" : "No")) + '</div></div>',
      '<div class="pea-preview-block"><div class="pea-preview-title">Base</div><div class="pea-preview-lines">' + esc(sectionInfo(content.base)) + '</div></div>',
      '<div class="pea-preview-block"><div class="pea-preview-title">Unidades</div><div class="pea-preview-lines">' + esc(sectionInfo(content.unidades)) + '</div></div>',
      '<div class="pea-preview-block"><div class="pea-preview-title">Actividades</div><div class="pea-preview-lines">' + esc(sectionInfo(content.actividades)) + '</div></div>'
    ].join("");
  }

  function renderPreview(versionData) {
    if (el("peaPreview")) el("peaPreview").innerHTML = buildPreviewHtml(versionData);
  }

  function renderHistorial() {
    var list = el("peaHistorial");
    var a = el("peaCompareA");
    var b = el("peaCompareB");
    if (!list || !a || !b) return;
    if (!state.versions.length) {
      list.innerHTML = "No existen versiones locales para esta materia.";
      a.innerHTML = "";
      b.innerHTML = "";
      return;
    }
    list.innerHTML = state.versions.map(function (item) {
      var r = item.resumen || {};
      return '<div class="pea-version-card"><div class="pea-version-head"><div><div class="pea-version-title">' + esc(item.versionId || "") + ' <span class="pea-badge">' + esc(item.origenTipo || "") + '</span></div><div class="pea-version-meta">' + esc(item.createdAtClient || "") + '</div></div></div><div class="pea-version-meta">Base: ' + Number(r.totalHojasBase || 0) + ' · Unidades: ' + Number(r.totalHojasUnidades || 0) + ' · Actividades: ' + Number(r.totalHojasActividades || 0) + '</div><div class="pea-version-meta">Nota: ' + esc(item.versionNota || "Sin nota") + '</div><div class="pea-version-meta">Sincronizado: ' + (item.synced ? "Sí" : "No") + '</div><div class="pea-version-actions"><button class="pea-btn pea-btn-primary" type="button" data-load-version="' + esc(item.versionId || "") + '">Cargar</button></div></div>';
    }).join("");
    a.innerHTML = b.innerHTML = state.versions.map(function (item) { return '<option value="' + esc(item.versionId || "") + '">' + esc(item.versionId || "") + '</option>'; }).join("");
    if (state.versions.length > 1) {
      a.value = state.versions[state.versions.length - 1].versionId;
      b.value = state.versions[0].versionId;
    }
  }

  function loadHistorial() {
    var m = selectedMateriaData();
    state.materiaId = m.materiaId;
    state.versions = PEA.store.listVersionsLocal(m.materiaId);
    renderHistorial();
    setSyncText();
    setStatus("Historial local cargado correctamente.", "ok");
  }

  function loadVersion(versionId) {
    var m = selectedMateriaData();
    state.currentVersion = PEA.store.readVersionLocal(m.materiaId, versionId);
    renderPreview(state.currentVersion);
    setStatus("Versión local cargada correctamente.", "ok");
  }

  function getSmartPayload() {
    if (!PEA.smartUpload || typeof PEA.smartUpload.getPayloadFiles !== "function") return null;
    return PEA.smartUpload.getPayloadFiles();
  }

  async function saveVersion() {
    var m = selectedMateriaData();
    var payload;
    var result;
    var smart = getSmartPayload();
    var versionNota = has("peaVersionNota") ? clean(el("peaVersionNota").value) : "";

    if (!PEA.parser || !PEA.parser.buildNormalizedUpload) throw new Error("PEA.parser.buildNormalizedUpload no está disponible.");
    setStatus("Procesando archivos...");

    if (smart && smart.mode === "triple") {
      payload = await PEA.parser.buildNormalizedUpload({ materiaNombre: m.materiaNombre, materiaCodigo: m.materiaCodigo, versionNota: versionNota, modo: "triple", baseFile: smart.baseFile, unidadesFile: smart.unidadesFile, actividadesFile: smart.actividadesFile });
    } else if (smart && smart.mode === "consolidado") {
      payload = await PEA.parser.buildNormalizedUpload({ materiaNombre: m.materiaNombre, materiaCodigo: m.materiaCodigo, versionNota: versionNota, modo: "consolidado", consolidadoFile: smart.consolidadoFile });
    } else if (mode() === "triple") {
      payload = await PEA.parser.buildNormalizedUpload({ materiaNombre: m.materiaNombre, materiaCodigo: m.materiaCodigo, versionNota: versionNota, modo: "triple", baseFile: has("peaFileBase") ? el("peaFileBase").files[0] : null, unidadesFile: has("peaFileUnidades") ? el("peaFileUnidades").files[0] : null, actividadesFile: has("peaFileActividades") ? el("peaFileActividades").files[0] : null });
    } else {
      payload = await PEA.parser.buildNormalizedUpload({ materiaNombre: m.materiaNombre, materiaCodigo: m.materiaCodigo, versionNota: versionNota, modo: "consolidado", consolidadoFile: has("peaFileConsolidado") ? el("peaFileConsolidado").files[0] : null });
    }

    payload.carreraId = m.carreraId;
    payload.carreraNombre = m.carreraNombre;
    payload.materiaId = m.materiaId;
    if (PEA.cccValidator && PEA.cccValidator.validateUpload) PEA.cccValidator.validateUpload(payload);
    result = PEA.store.saveVersionLocal(payload);
    setStatus("Versión guardada localmente: " + result.versionId, "ok");
    loadHistorial();
    loadVersion(result.versionId);
    setSyncText();
  }

  async function syncNow(force) {
    var pull = { skipped: true, pulled: 0 };
    var push = { skipped: true, pushed: 0 };
    setStatus("Sincronizando PEA...");
    if (PEA.store.pullFromFirebaseIfDue) pull = await PEA.store.pullFromFirebaseIfDue(force === true);
    if (PEA.store.pushPendingToFirebaseIfDue) push = await PEA.store.pushPendingToFirebaseIfDue(force === true);
    if (PEA.firebase && PEA.firebase.syncCurriculoNow) await PEA.firebase.syncCurriculoNow();
    if (state.materiaId) {
      state.versions = PEA.store.listVersionsLocal(state.materiaId);
      renderHistorial();
    }
    setSyncText();
    setStatus("Sincronización completada · descarga: " + Number(pull.pulled || 0) + " · subida: " + Number(push.pushed || 0), "ok");
  }

  function renderCompare(comparison) {
    var node = el("peaComparePreview");
    var lines = [];
    if (!node) return;
    if (!comparison) {
      node.textContent = "Aquí aparecerá el resumen comparativo.";
      return;
    }
    lines.push("Materia: " + String(comparison.materiaNombre || ""));
    lines.push("Versión A: " + String((comparison.versionA && comparison.versionA.versionId) || ""));
    lines.push("Versión B: " + String((comparison.versionB && comparison.versionB.versionId) || ""));
    lines.push("Total cambios: " + Number(comparison.totalCambios || 0));
    (comparison.sections || []).forEach(function (s) {
      lines.push("\n" + String(s.sectionName || "").toUpperCase());
      lines.push("  Agregadas: " + (s.added || []).length);
      lines.push("  Eliminadas: " + (s.removed || []).length);
      lines.push("  Modificadas: " + (s.changed || []).length);
    });
    node.textContent = lines.join("\n");
  }

  function compareVersions() {
    var m = selectedMateriaData();
    var a = has("peaCompareA") ? clean(el("peaCompareA").value) : "";
    var b = has("peaCompareB") ? clean(el("peaCompareB").value) : "";
    if (!a || !b) throw new Error("Debes seleccionar dos versiones.");
    if (a === b) throw new Error("Debes escoger dos versiones diferentes.");
    state.currentComparison = PEA.compare.compareVersions(PEA.store.readVersionLocal(m.materiaId, a), PEA.store.readVersionLocal(m.materiaId, b));
    renderCompare(state.currentComparison);
    setStatus("Comparación generada correctamente.", "ok");
  }

  function clearForm() {
    if (has("peaCarreraSelect")) el("peaCarreraSelect").value = "";
    if (has("peaMateriaSelect")) fillSelect(el("peaMateriaSelect"), [], "Selecciona una materia");
    ["peaMateriaTipo", "peaVersionNota", "peaFileBase", "peaFileUnidades", "peaFileActividades", "peaFileConsolidado", "peaSmartFiles"].forEach(function (id) { if (has(id)) el(id).value = ""; });
    if (PEA.smartUpload && typeof PEA.smartUpload.clear === "function") PEA.smartUpload.clear();
    state.carreraId = "";
    state.materiaId = "";
    state.materias = [];
    state.versions = [];
    state.currentVersion = null;
    state.currentComparison = null;
    if (el("peaHistorial")) el("peaHistorial").innerHTML = "Aún no se ha cargado el historial de esta materia.";
    if (el("peaPreview")) el("peaPreview").innerHTML = "Selecciona una versión para verla aquí.";
    renderCompare(null);
    setStatus("Formulario limpio.");
    setSyncText();
  }

  function bind() {
    Array.prototype.slice.call(document.querySelectorAll('input[name="peaModoCarga"]')).forEach(function (r) { r.addEventListener("change", toggleMode); });
    if (has("peaCarreraSelect")) el("peaCarreraSelect").addEventListener("change", function () { loadMaterias(clean(el("peaCarreraSelect").value)).then(updateMeta).catch(function (e) { console.error(e); setStatus(e.message || "No se pudieron cargar materias.", "error"); }); });
    if (has("peaMateriaSelect")) el("peaMateriaSelect").addEventListener("change", updateMeta);
    if (has("peaBtnGuardar")) el("peaBtnGuardar").addEventListener("click", function () { saveVersion().catch(function (e) { console.error(e); setStatus(e.message || "No se pudo guardar.", "error"); }); });
    if (has("peaBtnHistorial")) el("peaBtnHistorial").addEventListener("click", function () { try { loadHistorial(); } catch (e) { console.error(e); setStatus(e.message || "No se pudo cargar historial.", "error"); } });
    if (has("peaBtnSync")) el("peaBtnSync").addEventListener("click", function () { syncNow(true).catch(function (e) { console.error(e); setStatus(e.message || "No se pudo sincronizar.", "error"); }); });
    if (has("peaBtnLimpiar")) el("peaBtnLimpiar").addEventListener("click", clearForm);
    if (has("peaBtnPdf")) el("peaBtnPdf").addEventListener("click", function () { try { PEA.export.downloadPdfVersion(state.currentVersion); setStatus("PDF generado correctamente.", "ok"); } catch (e) { setStatus(e.message || "No se pudo generar PDF.", "error"); } });
    if (has("peaBtnExcel")) el("peaBtnExcel").addEventListener("click", function () { try { PEA.export.downloadThreeExcels(state.currentVersion); setStatus("Excel reconstruido correctamente.", "ok"); } catch (e) { setStatus(e.message || "No se pudo descargar Excel.", "error"); } });
    if (has("peaBtnComparar")) el("peaBtnComparar").addEventListener("click", function () { try { compareVersions(); } catch (e) { setStatus(e.message || "No se pudo comparar.", "error"); } });
    if (has("peaBtnPdfComparativo")) el("peaBtnPdfComparativo").addEventListener("click", function () { try { PEA.export.downloadPdfComparison(state.currentComparison); setStatus("PDF comparativo generado correctamente.", "ok"); } catch (e) { setStatus(e.message || "No se pudo generar PDF comparativo.", "error"); } });
    document.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-load-version]");
      if (btn) {
        try { loadVersion(btn.getAttribute("data-load-version")); }
        catch (e) { setStatus(e.message || "No se pudo cargar versión.", "error"); }
      }
    });
  }

  async function boot() {
    toggleMode();
    bind();
    setSyncText();
    await loadCarreras();
    await syncNow(false).catch(function () {});
    setStatus("Pantalla lista.", "ok");
  }

  PEA.app = { state: state, boot: boot, syncNow: syncNow, loadCarreras: loadCarreras, setStatus: setStatus, setSyncText: setSyncText };

  document.addEventListener("DOMContentLoaded", function () { boot().catch(function (error) { console.error(error); setStatus(error.message || "No se pudo iniciar PEA.", "error"); }); });
})(window, document);
