/*
Nombre del archivo: cale.state.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.state.js
Función:
- Estado interno del módulo cale
- Guarda vista actual, fecha actual, filtros activos y datos cacheados
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  var initialFilters = window.CALE.cloneDefaultFilters
    ? window.CALE.cloneDefaultFilters()
    : {
        search: "",
        priority: "",
        type: "",
        status: "",
        familyId: "",
        dateFrom: "",
        dateTo: ""
      };

  var store = {
    currentView: (window.CALE.config && window.CALE.config.defaultView) || "timeGridWeek",
    currentDate: new Date(),
    selectedEventId: "",

    rawDocs: [],
    familyDocs: [],
    mappedEvents: [],
    visibleEvents: [],

    activeFilters: initialFilters
  };

  window.CALE.store = store;

  window.CALE.getState = function () {
    return store;
  };

  window.CALE.updateState = function (patch) {
    if (!patch || typeof patch !== "object") return store;

    Object.keys(patch).forEach(function (key) {
      store[key] = patch[key];
    });

    return store;
  };

  window.CALE.resetFilterState = function () {
    store.activeFilters = window.CALE.cloneDefaultFilters();
    return store.activeFilters;
  };

  window.CALE.setCurrentView = function (viewName) {
    store.currentView = String(viewName || store.currentView);
    return store.currentView;
  };

  window.CALE.setCurrentDate = function (dateValue) {
    if (!dateValue) return store.currentDate;
    store.currentDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return store.currentDate;
  };

  window.CALE.setSelectedEventId = function (eventId) {
    store.selectedEventId = String(eventId || "");
    return store.selectedEventId;
  };

  window.CALE.getSelectedEventId = function () {
    // ✅ Permite que Detalle/Acciones lean el ID seleccionado de forma segura
    // Evita duplicar lógica y evita depender de variables locales en otros módulos.
    return store.selectedEventId;
  };

})(window);