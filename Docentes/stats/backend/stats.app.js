/*
Nombre del archivo: stats.app.js
Ruta: stats/backend/stats.app.js
Función:
- Inicialización principal de la app
- Carga de datos
- Procesamiento integral
- Render y refresco de derivados
*/
(function attachStatsApp(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var started = false;
  var loadingPromise = null;

  function render() {
    var UI = window.STATS.UI;
    var Store = window.STATS.Store;

    if (!UI || typeof UI.renderApp !== "function" || !Store) return;
    UI.renderApp(Store.getState());
  }

  function ensureDependencies() {
    var Store = window.STATS.Store;
    var Repository = window.STATS.Repository;
    var Normalize = window.STATS.Normalize;
    var Crossing = window.STATS.Crossing;
    var Metrics = window.STATS.Metrics;

    if (!Store || !Repository || !Normalize || !Crossing || !Metrics) {
      throw new Error("Faltan módulos obligatorios para inicializar la app.");
    }

    return {
      Store: Store,
      Repository: Repository,
      Normalize: Normalize,
      Crossing: Crossing,
      Metrics: Metrics
    };
  }

  function resolveMetricsBuilder(Metrics) {
    if (!Metrics) return null;

    /* Corrección:
       - La app ya no depende solo de buildMetrics.
       - Acepta las variantes reales expuestas por stats.metrics.js.
       - Evita que el refresco de derivados falle por una diferencia de nombre en la API. */
    if (typeof Metrics.buildMetrics === "function") return Metrics.buildMetrics;
    if (typeof Metrics.buildAll === "function") return Metrics.buildAll;
    if (typeof Metrics.build === "function") return Metrics.build;
    if (typeof Metrics.compute === "function") return Metrics.compute;
    if (typeof Metrics.calculate === "function") return Metrics.calculate;

    return null;
  }

  async function fetchRawData(Repository) {
    if (typeof Repository.fetchAll === "function") {
      return Repository.fetchAll();
    }

    if (
      typeof Repository.loadDocentes === "function" &&
      typeof Repository.loadCapacitaciones === "function"
    ) {
      return {
        docentes: await Repository.loadDocentes(),
        capacitaciones: await Repository.loadCapacitaciones()
      };
    }

    if (
      typeof Repository.getDocentes === "function" &&
      typeof Repository.getCapacitaciones === "function"
    ) {
      return {
        docentes: await Repository.getDocentes(),
        capacitaciones: await Repository.getCapacitaciones()
      };
    }

    throw new Error("No se encontró un método válido para traer los datos.");
  }

  function normalizeRawData(Normalize, raw) {
    if (typeof Normalize.normalizeAll === "function") {
      return Normalize.normalizeAll(raw);
    }

    return {
      docentes: typeof Normalize.normalizeDocentes === "function"
        ? Normalize.normalizeDocentes(raw && raw.docentes)
        : (raw && raw.docentes) || [],
      capacitaciones: typeof Normalize.normalizeCapacitaciones === "function"
        ? Normalize.normalizeCapacitaciones(raw && raw.capacitaciones)
        : (raw && raw.capacitaciones) || []
    };
  }

  function validateFirebaseOrFail() {
    var Firebase = window.STATS.Firebase;
    var Manifest = window.STATS.Manifest;
    var Store = window.STATS.Store;
    var missing;
    var firebaseStatus;

    if (!Store) return;

    if (Manifest && typeof Manifest.getMissingModules === "function") {
      missing = Manifest.getMissingModules();
      if (missing.length) {
        throw new Error("Faltan módulos por cargar: " + missing.join(", "));
      }
    }

    if (!Firebase || typeof Firebase.getStatus !== "function") {
      throw new Error("No se encontró el módulo de Firebase.");
    }

    firebaseStatus = Firebase.getStatus();
    if (!firebaseStatus.ok) {
      throw new Error(firebaseStatus.message || "No se pudo iniciar Firebase.");
    }
  }

  async function loadData() {
    var deps = ensureDependencies();
    var Store = deps.Store;
    var Repository = deps.Repository;
    var Normalize = deps.Normalize;
    var Crossing = deps.Crossing;
    var Metrics = deps.Metrics;
    var buildMetrics = resolveMetricsBuilder(Metrics);

    Store.setLoading(true, true);
    Store.clearError(true);
    render();

    try {
      validateFirebaseOrFail();

      var raw = await fetchRawData(Repository);
      Store.set("raw", raw, true);

      var normalized = normalizeRawData(Normalize, raw || {});
      Store.set("normalized", normalized, true);

      var crossed = typeof Crossing.crossAll === "function"
        ? Crossing.crossAll(normalized || {})
        : {
            docentes: [],
            capacitaciones: [],
            asignaciones: [],
            inconsistencias: []
          };
      Store.set("crossed", crossed, true);

      var filters = Store.get("filters") || {};
      var derived = buildMetrics
        ? buildMetrics(crossed || {}, filters)
        : {
            filteredDocentes: [],
            filteredCapacitaciones: [],
            filteredAsignaciones: [],
            filteredInconsistencias: [],
            metrics: {},
            detail: null
          };

      Store.set("derived", derived, true);
      Store.setLoading(false, true);
      Store.notify();
      render();

      return true;
    } catch (error) {
      Store.setLoading(false, true);
      Store.resetData(true);
      Store.setError(
        error && error.message ? error.message : "Error al cargar los datos.",
        true
      );
      Store.notify();
      render();
      return false;
    }
  }

  function refreshDerived() {
    var Store = window.STATS.Store;
    var Metrics = window.STATS.Metrics;
    var crossed;
    var filters;
    var derived;
    var buildMetrics = resolveMetricsBuilder(Metrics);

    if (!Store || !buildMetrics) return;

    crossed = Store.get("crossed") || {
      docentes: [],
      capacitaciones: [],
      asignaciones: [],
      inconsistencias: []
    };

    filters = Store.get("filters") || {};
    derived = buildMetrics(crossed, filters);
    Store.set("derived", derived, true);
    Store.notify();
    render();
  }

  async function reload() {
    return start(true);
  }

  async function start(forceReload) {
    if (loadingPromise && !forceReload) {
      return loadingPromise;
    }

    if (started && !forceReload) {
      render();
      return true;
    }

    loadingPromise = loadData();

    try {
      var ok = await loadingPromise;
      if (ok) {
        started = true;
      }
      return ok;
    } finally {
      loadingPromise = null;
    }
  }

  window.STATS.App = {
    start: start,
    reload: reload,
    loadData: loadData,
    refreshDerived: refreshDerived,
    render: render
  };
})(window);