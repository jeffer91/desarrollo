/*
Nombre del archivo: cale.calendar.collect.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.calendar.collect.js
Función:
- Recolecta eventos por fecha
- Ordena y normaliza datos para detalle
- Prepara metadatos usados por el modal
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  function normalizeForDetail(eventApi) {
    var shared = window.CALE.calendarShared;

    if (!eventApi) return null;

    var ext = eventApi.extendedProps || {};
    var startDate = eventApi.start instanceof Date ? eventApi.start : null;

    var safeDate = ext.date || "";
    if (!safeDate && startDate) {
      safeDate =
        startDate.getFullYear() + "-" +
        shared.pad2(startDate.getMonth() + 1) + "-" +
        shared.pad2(startDate.getDate());
    }

    var safeTime = ext.time || "";
    if (!safeTime && startDate && !eventApi.allDay) {
      safeTime =
        shared.pad2(startDate.getHours()) + ":" +
        shared.pad2(startDate.getMinutes());
    }

    return {
      id: String(ext.recordId || ext.baseId || eventApi.id || ""),
      title: String(eventApi.title || ""),
      start: startDate,
      allDay: !!eventApi.allDay,
      extendedProps: {
        uid: String(ext.uid || ""),
        desc: String(ext.desc || ""),
        place: String(ext.place || ""),
        date: String(safeDate || ""),
        time: String(safeTime || ""),
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

  function buildCardMeta(eventApi) {
    var shared = window.CALE.calendarShared;
    var ext = (eventApi && eventApi.extendedProps) || {};
    var parts = [];

    if (eventApi && !eventApi.allDay && eventApi.start instanceof Date) {
      parts.push(shared.formatHourFromDate(eventApi.start));
    }

    if (ext.status) parts.push(String(ext.status));
    if (ext.familyName) parts.push(String(ext.familyName));
    else if (ext.familyId) parts.push("Familia");

    return parts.join(" · ");
  }

  function getDayBounds(dateValue) {
    var shared = window.CALE.calendarShared;
    var start = shared.cloneDay(dateValue) || shared.cloneDay(new Date());
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

    return {
      start: start,
      end: end
    };
  }

  function getSafeEventEnd(eventApi) {
    if (!eventApi) return null;

    if (eventApi.end instanceof Date && !isNaN(eventApi.end.getTime())) {
      return eventApi.end;
    }

    if (!(eventApi.start instanceof Date) || isNaN(eventApi.start.getTime())) {
      return null;
    }

    if (eventApi.allDay) {
      return new Date(eventApi.start.getTime() + 24 * 60 * 60 * 1000);
    }

    return new Date(eventApi.start.getTime() + 60 * 1000);
  }

  function eventTouchesDay(eventApi, dateValue) {
    if (!eventApi || !(eventApi.start instanceof Date) || isNaN(eventApi.start.getTime())) {
      return false;
    }

    var bounds = getDayBounds(dateValue);
    var eventStart = eventApi.start;
    var eventEnd = getSafeEventEnd(eventApi);

    if (!eventEnd) return false;

    return eventStart < bounds.end && eventEnd > bounds.start;
  }

  function compareEventApis(a, b) {
    var aAllDay = !!(a && a.allDay);
    var bAllDay = !!(b && b.allDay);

    if (aAllDay !== bAllDay) {
      return aAllDay ? -1 : 1;
    }

    var aStart = a && a.start instanceof Date ? a.start.getTime() : 0;
    var bStart = b && b.start instanceof Date ? b.start.getTime() : 0;

    if (aStart !== bStart) {
      return aStart - bStart;
    }

    var aTitle = String((a && a.title) || "").toLowerCase();
    var bTitle = String((b && b.title) || "").toLowerCase();

    if (aTitle < bTitle) return -1;
    if (aTitle > bTitle) return 1;
    return 0;
  }

  function collectEventsForDate(dateValue) {
    var store = window.CALE.calendarStore;
    var api = store && store.calendarApi;

    if (!api) return [];

    return api.getEvents()
      .filter(function (eventApi) {
        return eventTouchesDay(eventApi, dateValue);
      })
      .sort(compareEventApis);
  }

  window.CALE.calendarCollect = {
    normalizeForDetail: normalizeForDetail,
    buildCardMeta: buildCardMeta,
    getDayBounds: getDayBounds,
    getSafeEventEnd: getSafeEventEnd,
    eventTouchesDay: eventTouchesDay,
    compareEventApis: compareEventApis,
    collectEventsForDate: collectEventsForDate
  };

})(window);