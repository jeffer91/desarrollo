/*
Nombre del archivo: cale.pendingpanel.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.pendingpanel.js
Función:
- Renderiza el panel propio de pendientes del día
- Evita depender del all-day nativo de FullCalendar
- Muestra pendientes y en-proceso de la fecha activa
- Reutiliza el modal de detalle existente al hacer click
*/

(function (window, document) {
  "use strict";

  window.CALE = window.CALE || {};

  function getEl(id) {
    return document.getElementById(id);
  }

  function normalize(value) {
    if (window.CALE.normalizeText) {
      return window.CALE.normalizeText(value);
    }
    return String(value || "").toLowerCase().trim();
  }

  function escapeHtml(value) {
    if (typeof window.CALE.escapeHtml === "function") {
      return window.CALE.escapeHtml(value);
    }

    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function toYmd(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return [
        value.getFullYear(),
        pad2(value.getMonth() + 1),
        pad2(value.getDate())
      ].join("-");
    }

    if (typeof value === "string") {
      return String(value).slice(0, 10);
    }

    return "";
  }

  function parseDateTimeFromEvent(eventObj) {
    var ext = (eventObj && eventObj.extendedProps) || {};
    var baseDate = String(ext.date || "").trim() || toYmd(eventObj && eventObj.start);

    if (!baseDate) return null;

    if (eventObj && eventObj.start instanceof Date && !isNaN(eventObj.start.getTime())) {
      return new Date(eventObj.start.getTime());
    }

    if (eventObj && typeof eventObj.start === "string" && eventObj.start.indexOf("T") > -1) {
      var parsed = new Date(eventObj.start);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    if (ext.time) {
      var parsedWithTime = new Date(baseDate + "T" + String(ext.time).trim() + ":00");
      if (!isNaN(parsedWithTime.getTime())) return parsedWithTime;
    }

    var parsedDate = new Date(baseDate + "T00:00:00");
    if (!isNaN(parsedDate.getTime())) return parsedDate;

    return null;
  }

  function formatHumanDate(dateValue) {
    var dateObj = parseDateTimeFromEvent({ start: dateValue });
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";

    try {
      return dateObj.toLocaleDateString("es-EC", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    } catch (err) {
      return toYmd(dateObj);
    }
  }

  function getCurrentViewType(rangeInfo) {
    if (rangeInfo && rangeInfo.viewType) {
      return String(rangeInfo.viewType);
    }

    if (window.CALE.getState) {
      var state = window.CALE.getState();
      if (state && state.currentView) {
        return String(state.currentView);
      }
    }

    return "";
  }

  function getActiveDateValue(rangeInfo) {
    if (rangeInfo && rangeInfo.start) {
      return toYmd(rangeInfo.start);
    }

    if (window.CALE.getState) {
      var state = window.CALE.getState();
      if (state && state.currentDate) {
        return toYmd(state.currentDate);
      }
    }

    return "";
  }

  function isPendingStatus(statusValue) {
    var safe = normalize(statusValue);
    return safe === "pendiente" || safe === "en-proceso";
  }

  function buildStatusOrder(statusValue) {
    var safe = normalize(statusValue);
    if (safe === "pendiente") return 0;
    if (safe === "en-proceso") return 1;
    return 9;
  }

  function compareEvents(a, b) {
    var aStatus = buildStatusOrder(a && a.extendedProps && a.extendedProps.status);
    var bStatus = buildStatusOrder(b && b.extendedProps && b.extendedProps.status);

    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }

    if (
      window.CALE.calendarCollect &&
      typeof window.CALE.calendarCollect.compareEventApis === "function"
    ) {
      return window.CALE.calendarCollect.compareEventApis(
        {
          allDay: !!(a && a.allDay),
          start: parseDateTimeFromEvent(a),
          title: String((a && a.title) || "")
        },
        {
          allDay: !!(b && b.allDay),
          start: parseDateTimeFromEvent(b),
          title: String((b && b.title) || "")
        }
      );
    }

    var aTitle = String((a && a.title) || "").toLowerCase();
    var bTitle = String((b && b.title) || "").toLowerCase();

    if (aTitle < bTitle) return -1;
    if (aTitle > bTitle) return 1;
    return 0;
  }

  function buildVisiblePendingEvents(eventsList, rangeInfo) {
    var activeDate = getActiveDateValue(rangeInfo);

    return (eventsList || [])
      .filter(function (item) {
        var ext = (item && item.extendedProps) || {};
        var eventDate = String(ext.date || "").trim() || toYmd(item && item.start);

        if (!activeDate || eventDate !== activeDate) {
          return false;
        }

        return isPendingStatus(ext.status);
      })
      .sort(compareEvents);
  }

  function buildDetailPayload(item) {
    var ext = (item && item.extendedProps) || {};
    var startDate = parseDateTimeFromEvent(item);

    return {
      id: String(ext.recordId || ext.baseId || (item && item.id) || ""),
      title: String((item && item.title) || ""),
      start: startDate,
      allDay: !!(item && item.allDay),
      extendedProps: {
        uid: String(ext.uid || ""),
        desc: String(ext.desc || ""),
        place: String(ext.place || ""),
        date: String(ext.date || "") || toYmd(startDate),
        time: String(ext.time || ""),
        familyId: String(ext.familyId || ""),
        familyName: String(ext.familyName || ""),
        priority: String(ext.priority || ""),
        type: String(ext.type || ""),
        status: String(ext.status || ""),
        sourceDate: String(ext.sourceDate || ""),
        persistentPending: !!ext.persistentPending,
        isSyntheticOccurrence: !!ext.isSyntheticOccurrence
      }
    };
  }

  function buildCardMeta(item) {
    var ext = (item && item.extendedProps) || {};
    var parts = [];

    if (ext.status) {
      parts.push({
        text: String(ext.status),
        className: "is-status-" + normalize(ext.status).replace(/\s+/g, "-")
      });
    }

    if (ext.familyName) {
      parts.push({
        text: String(ext.familyName),
        className: ""
      });
    }

    if (ext.priority) {
      parts.push({
        text: String(ext.priority),
        className: ""
      });
    }

    return parts;
  }

  function renderEmpty(shell, subtitle, count, list) {
    if (shell) shell.hidden = false;
    if (subtitle) {
      subtitle.textContent = "No hay pendientes ni eventos en proceso para la fecha activa.";
    }
    if (count) {
      count.textContent = "0";
    }
    if (list) {
      list.innerHTML = '<div class="cale-pending-empty">Sin pendientes para este día.</div>';
    }
  }

  function openDetail(item) {
    if (!window.CALE.detail || typeof window.CALE.detail.showEvent !== "function") {
      return;
    }

    // Corrección:
    // El panel usa el mismo modal de detalle ya existente para no duplicar lógica.
    window.CALE.detail.showEvent(buildDetailPayload(item));
  }

  function render(eventsList, rangeInfo) {
    var shell = getEl("cale-pending-shell");
    var title = getEl("cale-pending-title");
    var subtitle = getEl("cale-pending-subtitle");
    var count = getEl("cale-pending-count");
    var list = getEl("cale-pending-list");

    if (!shell || !title || !subtitle || !count || !list) {
      return;
    }

    if (getCurrentViewType(rangeInfo) !== "timeGridDay") {
      // Corrección:
      // El panel solo se muestra en la vista Día para no duplicar información en mes/semana.
      shell.hidden = true;
      list.innerHTML = "";
      return;
    }

    var activeDate = getActiveDateValue(rangeInfo);
    var pendingEvents = buildVisiblePendingEvents(eventsList, rangeInfo);

    shell.hidden = false;
    title.textContent = "Pendientes del día";
    subtitle.textContent = activeDate
      ? ("Fecha activa: " + formatHumanDate(activeDate) + ".")
      : "Fecha activa no disponible.";

    count.textContent = String(pendingEvents.length);

    if (!pendingEvents.length) {
      renderEmpty(shell, subtitle, count, list);
      return;
    }

    list.innerHTML = pendingEvents.map(function (item) {
      var ext = (item && item.extendedProps) || {};
      var meta = buildCardMeta(item);

      return '' +
        '<button type="button" class="cale-pending-card" data-id="' + escapeHtml(item.id || "") + '"' +
        ' style="border-left-color:' + escapeHtml(ext.accentColor || ext.borderColor || "#cbd5e1") + ';">' +
          '<div class="cale-pending-card-title">' + escapeHtml(item.title || "Sin título") + '</div>' +
          '<div class="cale-pending-card-meta">' +
            meta.map(function (part) {
              return '<span class="cale-pending-chip ' + escapeHtml(part.className || "") + '">' +
                escapeHtml(part.text || "") +
              '</span>';
            }).join("") +
          '</div>' +
          (
            ext.desc
              ? '<p class="cale-pending-card-desc">' + escapeHtml(ext.desc) + '</p>'
              : ''
          ) +
        '</button>';
    }).join("");

    Array.prototype.slice.call(list.querySelectorAll(".cale-pending-card")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = String(btn.getAttribute("data-id") || "");
        var selected = null;

        pendingEvents.some(function (item) {
          if (String(item.id || "") === id) {
            selected = item;
            return true;
          }
          return false;
        });

        if (!selected) return;

        // Corrección:
        // Abrimos el detalle del evento real seleccionado desde el panel.
        openDetail(selected);
      });
    });
  }

  function clear() {
    var shell = getEl("cale-pending-shell");
    var count = getEl("cale-pending-count");
    var list = getEl("cale-pending-list");
    var subtitle = getEl("cale-pending-subtitle");

    if (shell) shell.hidden = true;
    if (count) count.textContent = "0";
    if (subtitle) subtitle.textContent = "";
    if (list) list.innerHTML = "";
  }

  window.CALE.pendingPanel = {
    render: render,
    clear: clear
  };

})(window, document);