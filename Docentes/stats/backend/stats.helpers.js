/*
Nombre del archivo: stats.helpers.js
Ruta: stats/backend/stats.helpers.js
Función:
- Utilidades generales reutilizables
- Limpieza de strings
- Generación de claves seguras
- Helpers para arrays y objetos
*/

(function attachStatsHelpers(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function asString(value, fallback) {
    if (value == null) return fallback || "";
    return String(value).trim();
  }

  function asNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function asArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function safeLower(value) {
    return asString(value, "").toLowerCase();
  }

  function compactSpaces(value) {
    return asString(value, "").replace(/\s+/g, " ").trim();
  }

  function slugify(value) {
    return compactSpaces(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniqueStrings(list) {
    var output = [];
    var seen = {};

    asArray(list).forEach(function eachItem(item) {
      var value = compactSpaces(item);
      if (!value) return;
      if (seen[value]) return;
      seen[value] = true;
      output.push(value);
    });

    return output;
  }

  function uniqueBy(list, getKey) {
    var output = [];
    var seen = {};

    asArray(list).forEach(function eachItem(item) {
      var key = typeof getKey === "function" ? asString(getKey(item), "") : "";
      if (!key || seen[key]) return;
      seen[key] = true;
      output.push(item);
    });

    return output;
  }

  function sortTextAsc(list) {
    return asArray(list).sort(function sorter(a, b) {
      return asString(a, "").localeCompare(asString(b, ""), "es", {
        sensitivity: "base"
      });
    });
  }

  function groupBy(list, getKey) {
    var map = {};

    asArray(list).forEach(function eachItem(item) {
      var key = typeof getKey === "function" ? asString(getKey(item), "") : "";
      var finalKey = key || "Sin dato";
      if (!map[finalKey]) map[finalKey] = [];
      map[finalKey].push(item);
    });

    return map;
  }

  window.STATS.Helpers = {
    asString: asString,
    asNumber: asNumber,
    asArray: asArray,
    asObject: asObject,
    safeLower: safeLower,
    compactSpaces: compactSpaces,
    slugify: slugify,
    uniqueStrings: uniqueStrings,
    uniqueBy: uniqueBy,
    sortTextAsc: sortTextAsc,
    groupBy: groupBy
  };
})(window);