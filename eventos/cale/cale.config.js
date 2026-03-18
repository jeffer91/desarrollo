/*
Nombre del archivo: cale.config.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.config.js
Función:
- Configuración central del módulo cale
- Define colección, vistas, filtros base, selectores y paletas de color
- Deja la vista por defecto en semana
- Normaliza textos para soportar variantes como en_proceso
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  window.CALE.config = {
    moduleKey: "cale",
    moduleTitle: "Calendario Agenda",

    db: {
      collectionEvents: "events",
      collectionFamilies: "eventFamilies"
    },

    views: {
      month: "dayGridMonth",
      week: "timeGridWeek",
      day: "timeGridDay"
    },

    defaultView: "timeGridDay",

    ui: {
      pagerPageSize: 10
    },

    defaultFilters: {
      search: "",
      priority: "",
      type: "",
      status: "",
      familyId: "",
      dateFrom: "",
      dateTo: ""
    },

    firebaseConfigCandidates: [
      "IDEAS_FIREBASE_CONFIG",
      "EVENTOS_FIREBASE_CONFIG",
      "firebaseConfig"
    ],

    selectors: {
      status: "cale-status",
      calendar: "cale-calendar",
      currentRange: "cale-current-range",

      btnToday: "cale-btn-today",
      btnPrev: "cale-btn-prev",
      btnNext: "cale-btn-next",

      viewMonth: "cale-view-month",
      viewWeek: "cale-view-week",
      viewDay: "cale-view-day",

      search: "cale-search",
      priority: "cale-filter-priority",
      type: "cale-filter-type",
      statusFilter: "cale-filter-status",
      family: "cale-filter-family",
      dateFrom: "cale-filter-date-from",
      dateTo: "cale-filter-date-to",
      btnClearFilters: "cale-btn-clear-filters"
    },

    labels: {
      loading: "Cargando eventos desde la base de datos...",
      ready: "Eventos cargados correctamente.",
      noEvents: "No se encontraron eventos con los filtros actuales.",
      noSelection: "Selecciona una tarjeta para ver el detalle del evento.",
      firebaseMissing: "No se encontró una configuración de Firebase disponible para este módulo.",
      libraryMissing: "No se encontró la librería Firebase en esta pantalla."
    },

    colors: {
      priority: {
        critica: "#b91c1c",
        alta: "#dc2626",
        media: "#f59e0b",
        baja: "#16a34a",
        default: "#64748b"
      },

      type: {
        academico: "#1d4ed8",
        administrativo: "#7c3aed",
        reunion: "#0f766e",
        entrega: "#c2410c",
        seguimiento: "#0369a1",
        otro: "#475569",

        event: "#1d4ed8",
        pending: "#b45309",

        default: "#334155"
      },

      status: {
        programado: "#eff6ff",
        pendiente: "#fff7ed",
        "en-proceso": "#eff6ff",
        confirmado: "#ecfeff",
        completado: "#f0fdf4",
        cancelado: "#fef2f2",
        default: "#f8fafc"
      },

      text: {
        default: "#111827"
      }
    }
  };

  function safeText(value) {
    return String(value || "").trim();
  }

  function normalizeText(value) {
    return safeText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-");
  }

  function getMapValue(mapObj, key) {
    var safeKey = normalizeText(key);
    if (!safeKey) return mapObj.default;
    return mapObj[safeKey] || mapObj.default;
  }

  window.CALE.normalizeText = normalizeText;

  window.CALE.cloneDefaultFilters = function () {
    var src = window.CALE.config.defaultFilters;
    return {
      search: src.search,
      priority: src.priority,
      type: src.type,
      status: src.status,
      familyId: src.familyId,
      dateFrom: src.dateFrom,
      dateTo: src.dateTo
    };
  };

  window.CALE.resolveEventPalette = function (priority, type, status) {
    var cfg = window.CALE.config;
    var borderColor = getMapValue(cfg.colors.priority, priority);
    var accentColor = getMapValue(cfg.colors.type, type);
    var backgroundColor = getMapValue(cfg.colors.status, status);

    return {
      borderColor: borderColor,
      accentColor: accentColor,
      backgroundColor: backgroundColor,
      textColor: cfg.colors.text.default
    };
  };

  window.CALE.getEl = function (id) {
    return document.getElementById(id);
  };

  window.CALE.setStatus = function (text, isError) {
    var el = window.CALE.getEl(window.CALE.config.selectors.status);
    if (!el) return;

    el.textContent = String(text || "");
    el.style.color = isError ? "#b91c1c" : "#64748b";
    el.style.borderColor = isError ? "#fecaca" : "#d9e2ef";
    el.style.background = isError ? "#fff7f7" : "#f8fafc";
  };

  window.CALE.escapeHtml = function (value) {
    var map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return String(value || "").replace(/[&<>"']/g, function (char) {
      return map[char];
    });
  };

})(window);