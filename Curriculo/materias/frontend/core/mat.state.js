/*
Nombre del archivo: mat.state.js
Ubicación: /Curriculo/materias/frontend/core/mat.state.js
Función:
- Estado central del módulo Materias
- Guardar selección actual
- Recordar última carrera y último tipo de carga
- Guardar preview activo y estado dirty
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function storageKey() {
    return (MAT.config && MAT.config.localStorageKey) || "curriculo_materias_state_v1";
  }

  function readSaved() {
    try { return JSON.parse(window.localStorage.getItem(storageKey()) || "{}"); }
    catch (error) { return {}; }
  }

  function writeSaved(data) {
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify({
        selectedCareerId: clean(data.selectedCareerId),
        selectedLoadType: clean(data.selectedLoadType),
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      return false;
    }
    return true;
  }

  function emitChange(detail) {
    var ev;
    try { ev = new CustomEvent("mat-state-change", { detail: detail || {} }); }
    catch (error) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("mat-state-change", false, false, detail || {}); }
    window.dispatchEvent(ev);
  }

  MAT.state = {
    data: {
      careers: [],
      selectedCareerId: "",
      selectedCareerName: "",
      selectedCareerType: "",
      selectedLoadType: "",
      rawText: "",
      preview: null,
      dirty: false,
      ready: false,
      lastSavedAt: ""
    },

    restore: function () {
      var saved = readSaved();
      this.data.selectedCareerId = clean(saved.selectedCareerId);
      this.data.selectedLoadType = clean(saved.selectedLoadType);
      return saved;
    },

    persist: function () {
      return writeSaved(this.data);
    },

    setCareers: function (list) {
      this.data.careers = Array.isArray(list) ? list.slice() : [];
      emitChange({ type: "careers", total: this.data.careers.length });
    },

    setCareer: function (career) {
      career = career || {};
      this.data.selectedCareerId = clean(career.id);
      this.data.selectedCareerName = clean(career.nombre);
      this.data.selectedCareerType = clean(career.tipo);
      this.persist();
      emitChange({ type: "career", career: clone(career) });
    },

    clearCareer: function () {
      this.data.selectedCareerId = "";
      this.data.selectedCareerName = "";
      this.data.selectedCareerType = "";
      this.persist();
      emitChange({ type: "career", career: null });
    },

    setLoadType: function (value) {
      this.data.selectedLoadType = clean(value);
      this.persist();
      emitChange({ type: "loadType", loadType: this.data.selectedLoadType });
    },

    setRawText: function (value) {
      this.data.rawText = String(value || "");
    },

    setPreview: function (value) {
      this.data.preview = value || null;
      emitChange({ type: "preview", preview: clone(this.data.preview) });
    },

    clearPreview: function () {
      this.data.preview = null;
      emitChange({ type: "preview", preview: null });
    },

    setDirty: function (value) {
      this.data.dirty = !!value;
      emitChange({ type: "dirty", dirty: this.data.dirty });
    },

    setReady: function (value) {
      this.data.ready = !!value;
    },

    setSaved: function () {
      this.data.dirty = false;
      this.data.lastSavedAt = new Date().toISOString();
      emitChange({ type: "saved", savedAt: this.data.lastSavedAt });
    },

    getCareerById: function (id) {
      id = clean(id);
      return this.data.careers.find(function (item) {
        return clean(item && item.id) === id;
      }) || null;
    }
  };

  MAT.state.restore();
})(window);
