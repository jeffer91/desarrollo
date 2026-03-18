/*
Nombre del archivo: cale.map.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.map.js
Función:
- Convierte documentos de Firestore en eventos compatibles con FullCalendar
- Calcula color, fecha inicial, metadatos y texto de búsqueda
- Expande pendientes activos en cada día del rango visible
- Mantiene el id real del documento dentro de extendedProps.recordId
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeDateString(dateText) {
    var value = String(dateText || "").trim();
    if (!value) return "";

    var parts = value.split("-");
    if (parts.length !== 3) return "";

    var year = String(parts[0] || "").trim();
    var month = pad2(parts[1] || "00");
    var day = pad2(parts[2] || "00");

    if (!year) return "";
    return year + "-" + month + "-" + day;
  }

  function normalizeTimeString(timeText) {
    var value = String(timeText || "").trim();
    if (!value) return "";

    var parts = value.split(":");
    if (!parts.length) return "";

    var hh = pad2(parts[0] || "00");
    var mm = pad2(parts[1] || "00");

    return hh + ":" + mm + ":00";
  }

  function ymdFromDate(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
    return [
      dateObj.getFullYear(),
      pad2(dateObj.getMonth() + 1),
      pad2(dateObj.getDate())
    ].join("-");
  }

  function dayStart(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return null;
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }

  function addDays(dateObj, amount) {
    var base = dayStart(dateObj);
    if (!base) return null;
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + Number(amount || 0));
  }

  function parseYmdToDate(dateText) {
    var safeDate = normalizeDateString(dateText);
    if (!safeDate) return null;

    var parts = safeDate.split("-");
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);

    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
  }

  function coerceRangeStart(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return dayStart(value);
    }

    if (typeof value === "string") {
      return parseYmdToDate(value);
    }

    return null;
  }

  function buildVisibleBounds(rangeInfo) {
    var start = coerceRangeStart(rangeInfo && rangeInfo.start);
    var end = coerceRangeStart(rangeInfo && rangeInfo.end);

    if (!start) {
      start = dayStart(new Date());
    }

    if (!end || end.getTime() <= start.getTime()) {
      end = addDays(start, 1);
    }

    return {
      start: start,
      end: end
    };
  }

  function buildDateTime(dateText, timeText) {
    var safeDate = normalizeDateString(dateText);
    if (!safeDate) return null;

    var safeTime = normalizeTimeString(timeText);

    if (!safeTime) {
      return {
        start: safeDate,
        end: null,
        allDay: true
      };
    }

    return {
      start: safeDate + "T" + safeTime,
      end: null,
      allDay: false
    };
  }

  function findFamilyName(familyDoc) {
    if (!familyDoc || !familyDoc.data) return "";

    return String(
      familyDoc.data.name ||
      familyDoc.data.title ||
      familyDoc.data.label ||
      ""
    ).trim();
  }

  function buildFamilyIndex(familyDocs) {
    var index = {};

    (familyDocs || []).forEach(function (item) {
      index[String(item.id || "")] = findFamilyName(item);
    });

    return index;
  }

  function normalizeValue(value) {
    if (window.CALE.normalizeText) {
      return window.CALE.normalizeText(value);
    }

    return String(value || "").toLowerCase().trim();
  }

  function isPendingType(typeValue) {
    var safeType = normalizeValue(typeValue);
    return safeType === "pending" || safeType === "pendiente";
  }

  function isPendingStatus(statusValue) {
    var safeStatus = normalizeValue(statusValue);
    return safeStatus === "pendiente" || safeStatus === "en-proceso";
  }

  function isClosedStatus(statusValue) {
    var safeStatus = normalizeValue(statusValue);
    return safeStatus === "completado" || safeStatus === "cancelado";
  }

  function isPersistentPending(data) {
    var safeType = normalizeValue(data && data.type);
    var safeStatus = normalizeValue(data && data.status);

    if (isClosedStatus(safeStatus)) {
      return false;
    }

    if (isPendingType(safeType)) {
      return true;
    }

    if (!safeType && isPendingStatus(safeStatus)) {
      return true;
    }

    return false;
  }

  function mapDocToEvent(docRecord, familyIndex) {
    var data = (docRecord && docRecord.data) || {};
    var title = String(data.title || "Sin título").trim() || "Sin título";
    var recordId = String(docRecord && docRecord.id || "");

    var persistentPending = isPersistentPending(data);
    var sourceDate = String(data.date || "").trim();
    var effectiveDate = sourceDate || (persistentPending ? ymdFromDate(new Date()) : "");

    var timeParts = buildDateTime(effectiveDate, data.time);
    var palette = window.CALE.resolveEventPalette(data.priority, data.type, data.status);

    if (!timeParts || !timeParts.start) {
      return null;
    }

    var familyName = familyIndex[String(data.familyId || "")] || "";
    var searchText = [
      title,
      data.desc || "",
      data.place || "",
      data.priority || "",
      data.type || "",
      data.status || "",
      familyName
    ].join(" | ");

    return {
      id: recordId,
      title: title,
      start: timeParts.start,
      end: timeParts.end,
      allDay: timeParts.allDay,

      backgroundColor: palette.backgroundColor,
      borderColor: palette.borderColor,
      textColor: palette.textColor,

      extendedProps: {
        recordId: recordId,
        baseId: recordId,
        uid: String(data.uid || ""),
        desc: String(data.desc || ""),
        place: String(data.place || ""),
        date: String(effectiveDate || ""),
        sourceDate: String(sourceDate || ""),
        autoDateAssigned: !sourceDate && !!effectiveDate && persistentPending,
        time: String(data.time || ""),
        familyId: String(data.familyId || ""),
        familyName: familyName,
        priority: String(data.priority || ""),
        type: String(data.type || ""),
        status: String(data.status || ""),
        accentColor: palette.accentColor,
        searchText: normalizeValue(searchText),
        persistentPending: persistentPending,
        isSyntheticOccurrence: false
      }
    };
  }

  function cloneEventForDate(baseEvent, dateText) {
    var ext = baseEvent.extendedProps || {};
    var safeDate = normalizeDateString(dateText);
    if (!safeDate) return null;

    var safeTime = normalizeTimeString(ext.time || "");
    var allDay = !safeTime;

    return {
      id: String(ext.recordId || baseEvent.id || "") + "__" + safeDate,
      title: baseEvent.title,
      start: allDay ? safeDate : (safeDate + "T" + safeTime),
      end: null,
      allDay: allDay,

      backgroundColor: baseEvent.backgroundColor,
      borderColor: baseEvent.borderColor,
      textColor: baseEvent.textColor,

      extendedProps: {
        recordId: String(ext.recordId || ""),
        baseId: String(ext.baseId || ext.recordId || ""),
        uid: String(ext.uid || ""),
        desc: String(ext.desc || ""),
        place: String(ext.place || ""),
        date: safeDate,
        sourceDate: String(ext.sourceDate || ""),
        autoDateAssigned: !!ext.autoDateAssigned,
        time: String(ext.time || ""),
        familyId: String(ext.familyId || ""),
        familyName: String(ext.familyName || ""),
        priority: String(ext.priority || ""),
        type: String(ext.type || ""),
        status: String(ext.status || ""),
        accentColor: String(ext.accentColor || ""),
        searchText: String(ext.searchText || ""),
        persistentPending: true,
        isSyntheticOccurrence: true,
        occurrenceDate: safeDate
      }
    };
  }

  function expandEventForRange(baseEvent, rangeInfo) {
    var ext = (baseEvent && baseEvent.extendedProps) || {};

    if (!ext.persistentPending) {
      return baseEvent ? [baseEvent] : [];
    }

    var bounds = buildVisibleBounds(rangeInfo);
    var current = bounds.start;
    var end = bounds.end;
    var list = [];

    while (current && end && current.getTime() < end.getTime()) {
      var clone = cloneEventForDate(baseEvent, ymdFromDate(current));
      if (clone) list.push(clone);
      current = addDays(current, 1);
    }

    if (!list.length && baseEvent) {
      list.push(baseEvent);
    }

    return list;
  }

  function mapDocsToEvents(rawDocs, familyDocs, rangeInfo) {
    var familyIndex = buildFamilyIndex(familyDocs);
    var mapped = [];

    (rawDocs || []).forEach(function (docRecord) {
      var baseEvent = mapDocToEvent(docRecord, familyIndex);
      if (!baseEvent) return;

      var expanded = expandEventForRange(baseEvent, rangeInfo);

      (expanded || []).forEach(function (item) {
        if (item) mapped.push(item);
      });
    });

    return mapped;
  }

  window.CALE.mapDocToEvent = mapDocToEvent;
  window.CALE.mapDocsToEvents = mapDocsToEvents;
  window.CALE.buildFamilyIndex = buildFamilyIndex;
  window.CALE.expandEventForRange = expandEventForRange;

})(window);