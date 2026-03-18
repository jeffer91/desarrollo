/*
Nombre del archivo: cale.filters.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.filters.js
Función:
- Lee y escribe filtros del módulo cale
- Aplica filtros a la lista de eventos
- Carga familias dinámicas en el selector de familia
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  function getSelectors() {
    return window.CALE.config.selectors;
  }

  function getFilterEls() {
    var s = getSelectors();

    return {
      search: window.CALE.getEl(s.search),
      priority: window.CALE.getEl(s.priority),
      type: window.CALE.getEl(s.type),
      status: window.CALE.getEl(s.statusFilter),
      family: window.CALE.getEl(s.family),
      dateFrom: window.CALE.getEl(s.dateFrom),
      dateTo: window.CALE.getEl(s.dateTo),
      btnClear: window.CALE.getEl(s.btnClearFilters)
    };
  }

  function readFromUi() {
    var el = getFilterEls();

    return {
      search: String(el.search && el.search.value || "").trim(),
      priority: String(el.priority && el.priority.value || "").trim(),
      type: String(el.type && el.type.value || "").trim(),
      status: String(el.status && el.status.value || "").trim(),
      familyId: String(el.family && el.family.value || "").trim(),
      dateFrom: String(el.dateFrom && el.dateFrom.value || "").trim(),
      dateTo: String(el.dateTo && el.dateTo.value || "").trim()
    };
  }

  function writeToUi(filters) {
    var el = getFilterEls();
    var data = filters || window.CALE.cloneDefaultFilters();

    if (el.search) el.search.value = data.search || "";
    if (el.priority) el.priority.value = data.priority || "";
    if (el.type) el.type.value = data.type || "";
    if (el.status) el.status.value = data.status || "";
    if (el.family) el.family.value = data.familyId || "";
    if (el.dateFrom) el.dateFrom.value = data.dateFrom || "";
    if (el.dateTo) el.dateTo.value = data.dateTo || "";
  }

  function dateValueFromEvent(eventObj) {
    if (!eventObj || !eventObj.start) return "";
    return String(eventObj.start).slice(0, 10);
  }

  function normalize(value) {
    return window.CALE.normalizeText ? window.CALE.normalizeText(value) : String(value || "").toLowerCase();
  }

  function applyToEvents(events, filters) {
    var data = filters || window.CALE.cloneDefaultFilters();
    var searchNeedle = normalize(data.search);

    return (events || []).filter(function (item) {
      var ext = item.extendedProps || {};
      var eventDate = dateValueFromEvent(item);

      if (searchNeedle) {
        var haystack = normalize(ext.searchText || item.title || "");
        if (haystack.indexOf(searchNeedle) === -1) return false;
      }

      if (data.priority && normalize(ext.priority) !== normalize(data.priority)) return false;
      if (data.type && normalize(ext.type) !== normalize(data.type)) return false;
      if (data.status && normalize(ext.status) !== normalize(data.status)) return false;
      if (data.familyId && String(ext.familyId || "") !== String(data.familyId)) return false;

      if (data.dateFrom && eventDate && eventDate < data.dateFrom) return false;
      if (data.dateTo && eventDate && eventDate > data.dateTo) return false;

      return true;
    });
  }

  function syncToState() {
    var filters = readFromUi();
    var state = window.CALE.getState();
    state.activeFilters = filters;
    return filters;
  }

  function resetUiAndState() {
    var clean = window.CALE.cloneDefaultFilters();
    writeToUi(clean);
    window.CALE.updateState({ activeFilters: clean });
    return clean;
  }

  function populateFamilyOptions(familyDocs) {
    var el = getFilterEls().family;
    if (!el) return;

    var currentValue = el.value || "";
    var baseHtml = '<option value="">Todas</option>';
    var used = {};

    (familyDocs || []).forEach(function (item) {
      var id = String(item.id || "").trim();
      var label = String(
        item.data && (item.data.name || item.data.title || item.data.label) || ""
      ).trim();

      if (!id || !label || used[id]) return;
      used[id] = true;

      baseHtml += '<option value="' +
        window.CALE.escapeHtml(id) +
        '">' +
        window.CALE.escapeHtml(label) +
        '</option>';
    });

    el.innerHTML = baseHtml;

    if (currentValue && used[currentValue]) {
      el.value = currentValue;
    }
  }

  function bindUi(onChange) {
    var el = getFilterEls();

    function handleChange() {
      var filters = syncToState();
      if (typeof onChange === "function") onChange(filters);
    }

    ["search", "priority", "type", "status", "family", "dateFrom", "dateTo"].forEach(function (key) {
      if (!el[key]) return;

      var eventName = key === "search" ? "input" : "change";
      el[key].addEventListener(eventName, handleChange);
    });

    if (el.btnClear) {
      el.btnClear.addEventListener("click", function () {
        var clean = resetUiAndState();
        if (typeof onChange === "function") onChange(clean);
      });
    }
  }

  window.CALE.filters = {
    readFromUi: readFromUi,
    writeToUi: writeToUi,
    applyToEvents: applyToEvents,
    syncToState: syncToState,
    resetUiAndState: resetUiAndState,
    populateFamilyOptions: populateFamilyOptions,
    bindUi: bindUi
  };

})(window);