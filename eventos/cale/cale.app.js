/*
Nombre del archivo: cale.app.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.app.js
Función:
- Archivo principal del módulo cale
- Coordina la carga de datos, filtros, calendario y detalle
- Reconstruye eventos según el rango visible del calendario
- Hace persistentes los pendientes en el rango actual
- Mantiene el módulo independiente y conectado solo por Firestore
*/

(function (window, document) {
  "use strict";

  window.CALE = window.CALE || {};

  function getState() {
    return window.CALE.getState();
  }

  function setStatus(text, isError) {
    window.CALE.setStatus(text, !!isError);
  }

  function getViewButtons() {
    var buttons = document.querySelectorAll(".cale-view-btn");
    return Array.prototype.slice.call(buttons || []);
  }

  function getCurrentRangeFromCalendar() {
    if (window.CALE.calendar && typeof window.CALE.calendar.getVisibleRange === "function") {
      return window.CALE.calendar.getVisibleRange();
    }

    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

    return {
      start: start,
      end: end,
      viewType: getState().currentView || window.CALE.config.defaultView
    };
  }

  function renderPendingPanel(eventsList, rangeInfo) {
    if (
      window.CALE.pendingPanel &&
      typeof window.CALE.pendingPanel.render === "function"
    ) {
      // Corrección:
      // El panel propio recibe la lista visible y el rango activo
      // para mostrar los pendientes del día fuera del all-day nativo.
      window.CALE.pendingPanel.render(eventsList || [], rangeInfo || getCurrentRangeFromCalendar());
    }
  }

  function clearPendingPanel() {
    if (
      window.CALE.pendingPanel &&
      typeof window.CALE.pendingPanel.clear === "function"
    ) {
      // Corrección:
      // Limpiamos el panel cuando el módulo inicia o cae en error
      // para evitar estados visuales viejos.
      window.CALE.pendingPanel.clear();
    }
  }

  function bindTopButtons() {
    var s = window.CALE.config.selectors;

    var btnToday = window.CALE.getEl(s.btnToday);
    var btnPrev = window.CALE.getEl(s.btnPrev);
    var btnNext = window.CALE.getEl(s.btnNext);

    if (btnToday) {
      btnToday.addEventListener("click", function () {
        window.CALE.calendar.goToday();
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", function () {
        window.CALE.calendar.goPrev();
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", function () {
        window.CALE.calendar.goNext();
      });
    }

    getViewButtons().forEach(function (btn) {
      btn.addEventListener("click", function () {
        var viewName = String(btn.getAttribute("data-view") || "").trim();
        if (!viewName) return;
        window.CALE.calendar.changeView(viewName);
      });
    });
  }

  function buildStatusSummary(totalVisible, totalMapped) {
    if (!totalMapped) {
      return window.CALE.config.labels.noEvents;
    }

    if (!totalVisible) {
      return "No se encontraron eventos con los filtros actuales.";
    }

    return "Mostrando " + totalVisible + " evento" +
      (totalVisible === 1 ? "" : "s") +
      " de " + totalMapped + " cargado" +
      (totalMapped === 1 ? "" : "s") + ".";
  }

  function buildMappedEventsForCurrentRange(state) {
    var rangeInfo = state.currentRange || getCurrentRangeFromCalendar();

    return window.CALE.mapDocsToEvents(
      state.rawDocs || [],
      state.familyDocs || [],
      rangeInfo
    );
  }

  function applyFiltersAndRender() {
    var state = getState();
    var filters = state.activeFilters || window.CALE.cloneDefaultFilters();
    var currentRange = state.currentRange || getCurrentRangeFromCalendar();

    var mappedForRange = buildMappedEventsForCurrentRange({
      rawDocs: state.rawDocs || [],
      familyDocs: state.familyDocs || [],
      currentRange: currentRange
    });

    var visible = window.CALE.filters.applyToEvents(mappedForRange, filters);

    window.CALE.updateState({
      currentRange: currentRange,
      mappedEvents: mappedForRange,
      visibleEvents: visible
    });

    window.CALE.calendar.replaceEvents(visible);

    // Corrección:
    // Después de renderizar el calendario, sincronizamos el panel
    // de pendientes con los eventos visibles y la fecha/rango activo.
    renderPendingPanel(visible, currentRange);

    setStatus(buildStatusSummary(visible.length, mappedForRange.length), false);

    if (!visible.length) {
      window.CALE.detail.clear();

      // Corrección:
      // El panel también debe reflejar el estado vacío
      // cuando no hay resultados visibles.
      renderPendingPanel([], currentRange);
    }
  }

  async function loadData() {
    setStatus(window.CALE.config.labels.loading, false);

    var result = await Promise.all([
      window.CALE.db.getEvents(),
      window.CALE.db.getFamilies()
    ]);

    var rawDocs = result[0] || [];
    var familyDocs = result[1] || [];

    window.CALE.updateState({
      rawDocs: rawDocs,
      familyDocs: familyDocs
    });

    window.CALE.filters.populateFamilyOptions(familyDocs);
    applyFiltersAndRender();
  }

  function initFilterLayer() {
    var initialFilters = window.CALE.cloneDefaultFilters();

    window.CALE.updateState({
      activeFilters: initialFilters
    });

    window.CALE.filters.writeToUi(initialFilters);

    window.CALE.filters.bindUi(function (filters) {
      window.CALE.updateState({
        activeFilters: filters
      });
      applyFiltersAndRender();
    });
  }

  function initCalendarLayer() {
    var state = getState();

    if (window.CALE.calendar && typeof window.CALE.calendar.setRangeChangeHandler === "function") {
      window.CALE.calendar.setRangeChangeHandler(function (rangeInfo) {
        window.CALE.updateState({
          currentRange: rangeInfo || getCurrentRangeFromCalendar()
        });

        applyFiltersAndRender();
      });
    }

    window.CALE.calendar.init(state.visibleEvents || []);

    window.CALE.updateState({
      currentRange: getCurrentRangeFromCalendar()
    });

    window.CALE.calendar.setActiveViewButton(state.currentView);
  }

  async function start() {
    try {
      window.CALE.detail.clear();
      clearPendingPanel();

      initFilterLayer();
      initCalendarLayer();
      bindTopButtons();

      var btnDone = window.CALE.getEl("cale-detail-btn-done");
      if (btnDone && !btnDone.__caleBound) {
        btnDone.__caleBound = true; // ✅ evita duplicar listeners si start se re-ejecuta
        btnDone.addEventListener("click", function () {
          var id = String((getState().selectedEventId || (window.CALE.getSelectedEventId ? window.CALE.getSelectedEventId() : "")) || "").trim();
          if (!id) return;

          btnDone.disabled = true;

          // ✅ Marca como "completado" en Firestore y recarga para que el evento se actualice/oculte según filtros.
          window.CALE.db.setEventStatus(id, "completado")
            .then(loadData)
            .then(function () {
              window.CALE.detail.clear();
            })
            .catch(function (err) {
              console.error(err);
              setStatus(
                err && err.message
                  ? err.message
                  : "No fue posible marcar el evento como realizado.",
                true
              );
            })
            .finally(function () {
              btnDone.disabled = false;
            });
        });
      }

      await loadData();
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : "Ocurrió un error al cargar el módulo.", true);
      window.CALE.detail.clear();
      clearPendingPanel();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})(window, document);