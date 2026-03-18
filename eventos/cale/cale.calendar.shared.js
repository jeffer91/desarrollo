/*
Nombre del archivo: cale.calendar.shared.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.calendar.shared.js
Función:
- Mantiene el estado compartido del calendario
- Centraliza utilidades reutilizables
- Reduce el tamaño del archivo principal
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  var previousStore = window.CALE.calendarStore || {};

  window.CALE.calendarStore = {
    calendarApi: previousStore.calendarApi || null,
    rangeChangeHandler: previousStore.rangeChangeHandler || null,
    pagerState: previousStore.pagerState || {
      isOpen: false,
      date: null,
      title: "",
      events: [],
      page: 1,
      pageSize: 10,
      refs: null
    }
  };

  function hasCalendarLibrary() {
    return !!(window.FullCalendar && window.FullCalendar.Calendar);
  }

  function getCalendarEl() {
    return window.CALE.getEl(window.CALE.config.selectors.calendar);
  }

  function getCurrentRangeEl() {
    return window.CALE.getEl(window.CALE.config.selectors.currentRange);
  }

  function getViewButtons() {
    var buttons = document.querySelectorAll(".cale-view-btn");
    return Array.prototype.slice.call(buttons || []);
  }

  function setCurrentRangeText(text) {
    var el = getCurrentRangeEl();
    if (!el) return;
    el.textContent = String(text || "");
  }

  function setActiveViewButton(viewName) {
    getViewButtons().forEach(function (btn) {
      var isActive = String(btn.getAttribute("data-view") || "") === String(viewName || "");
      btn.classList.toggle("is-active", isActive);
    });
  }

  function cloneDay(value) {
    if (!(value instanceof Date) || isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function buildRangeInfoFromView(view) {
    if (!view) return null;

    var start = cloneDay(view.currentStart || view.activeStart || view.start);
    var end = cloneDay(view.currentEnd || view.activeEnd || view.end);

    if (!start) {
      start = cloneDay(new Date());
    }

    if (!end || end.getTime() <= start.getTime()) {
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    }

    return {
      start: start,
      end: end,
      viewType: String(view.type || "")
    };
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function toYmd(value) {
    var d = cloneDay(value);
    if (!d) return "";
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function formatDateLabel(dateValue) {
    var d = cloneDay(dateValue) || cloneDay(new Date());

    try {
      return new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(d);
    } catch (err) {
      return toYmd(d);
    }
  }

  function formatHourLine(info) {
    var timeText = String(info.timeText || "").trim();
    if (!timeText) return "";
    return timeText;
  }

  function formatHourFromDate(value) {
    if (!(value instanceof Date) || isNaN(value.getTime())) return "";
    return pad2(value.getHours()) + ":" + pad2(value.getMinutes());
  }

  function createNode(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text !== "undefined" && text !== null) {
      el.textContent = String(text);
    }
    return el;
  }

  function isDayViewName(viewName) {
    return String(viewName || "") === "timeGridDay";
  }

  function getConfiguredPagerPageSize() {
    var cfg = window.CALE && window.CALE.config && window.CALE.config.ui;
    var value = Number(cfg && cfg.pagerPageSize);
    if (!isFinite(value) || value < 1) return 10;
    return Math.floor(value);
  }

  window.CALE.calendarShared = {
    hasCalendarLibrary: hasCalendarLibrary,
    getCalendarEl: getCalendarEl,
    getCurrentRangeEl: getCurrentRangeEl,
    getViewButtons: getViewButtons,
    setCurrentRangeText: setCurrentRangeText,
    setActiveViewButton: setActiveViewButton,
    cloneDay: cloneDay,
    buildRangeInfoFromView: buildRangeInfoFromView,
    pad2: pad2,
    toYmd: toYmd,
    formatDateLabel: formatDateLabel,
    formatHourLine: formatHourLine,
    formatHourFromDate: formatHourFromDate,
    createNode: createNode,
    isDayViewName: isDayViewName,
    getConfiguredPagerPageSize: getConfiguredPagerPageSize
  };

})(window);