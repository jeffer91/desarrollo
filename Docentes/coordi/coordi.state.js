/*
=========================================================
Nombre completo: coordi.state.js
Ruta o ubicación: /Docentes/coordi/coordi.state.js
Función o funciones:
- Mantener el estado interno de la pantalla Coordi.
- Guardar filas actuales, filtro, errores, estado de guardado y cambios pendientes.
- Exponer métodos seguros para leer y actualizar la información.
Con qué se une:
- coordi.app.js
- coordi.table.js
- coordi.repo.js
- coordi.validate.js
=========================================================
*/

(function () {
  "use strict";

  const initialState = {
    rows: [],
    filterText: "",
    errors: [],
    dirty: false,
    loading: false,
    lastSavedAt: null,
    source: "none"
  };

  let state = structuredCloneSafe(initialState);

  function structuredCloneSafe(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function createId() {
    return `coordi_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function normalizeRow(row) {
    return {
      id: row && row.id ? String(row.id) : createId(),
      carrera: row && row.carrera ? String(row.carrera).trim() : "",
      coordinador: row && row.coordinador ? String(row.coordinador).trim() : "",
      programa: row && row.programa ? String(row.programa).trim() : "",
      telegram: row && row.telegram ? String(row.telegram).trim() : "",
      updatedAt: row && row.updatedAt ? row.updatedAt : new Date().toISOString()
    };
  }

  function getState() {
    return structuredCloneSafe(state);
  }

  function getRows() {
    return structuredCloneSafe(state.rows);
  }

  function setRows(rows, options = {}) {
    const safeRows = Array.isArray(rows) ? rows.map(normalizeRow) : [];

    state.rows = safeRows;
    state.source = options.source || state.source;
    state.dirty = Boolean(options.dirty);
    state.errors = [];

    return getRows();
  }

  function addRow(partial = {}) {
    const row = normalizeRow(partial);

    state.rows.push(row);
    state.dirty = true;

    return structuredCloneSafe(row);
  }

  function updateRow(rowId, field, value) {
    const allowedFields = ["carrera", "coordinador", "programa", "telegram"];

    if (!allowedFields.includes(field)) {
      return null;
    }

    const found = state.rows.find((row) => row.id === rowId);

    if (!found) {
      return null;
    }

    found[field] = String(value || "").trimStart();
    found.updatedAt = new Date().toISOString();
    state.dirty = true;

    return structuredCloneSafe(found);
  }

  function deleteRow(rowId) {
    const before = state.rows.length;

    state.rows = state.rows.filter((row) => row.id !== rowId);

    if (state.rows.length !== before) {
      state.dirty = true;
    }

    return getRows();
  }

  function setFilterText(value) {
    state.filterText = String(value || "").trim();
  }

  function getFilterText() {
    return state.filterText;
  }

  function setErrors(errors) {
    state.errors = Array.isArray(errors) ? errors : [];
  }

  function getErrors() {
    return structuredCloneSafe(state.errors);
  }

  function markSaved() {
    state.dirty = false;
    state.lastSavedAt = new Date().toISOString();
  }

  function markDirty() {
    state.dirty = true;
  }

  function setLoading(value) {
    state.loading = Boolean(value);
  }

  function reset() {
    state = structuredCloneSafe(initialState);
  }

  window.CoordiState = {
    getState,
    getRows,
    setRows,
    addRow,
    updateRow,
    deleteRow,
    setFilterText,
    getFilterText,
    setErrors,
    getErrors,
    markSaved,
    markDirty,
    setLoading,
    reset,
    createId
  };
})();