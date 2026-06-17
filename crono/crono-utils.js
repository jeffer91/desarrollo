/*
=========================================================
Nombre completo: crono-utils.js
Ruta o ubicación: /Requisitos/crono/crono-utils.js

Función o funciones:
1. Centralizar funciones reutilizables.
2. Normalizar textos, números, fechas y horas.
3. Descargar archivos generados.
4. Evitar errores por datos vacíos.
=========================================================
*/
(function (window) {
  "use strict";

  function asText(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function normalizeText(value) {
    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeKey(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizePerson(value) {
    return normalizeText(value).toUpperCase();
  }

  function pickFirst(obj, keys) {
    var safe = obj || {};
    var list = Array.isArray(keys) ? keys : [];

    for (var i = 0; i < list.length; i += 1) {
      var key = list[i];

      if (
        safe[key] !== undefined &&
        safe[key] !== null &&
        asText(safe[key]) !== ""
      ) {
        return safe[key];
      }
    }

    var byNorm = Object.create(null);
    Object.keys(safe).forEach(function (k) {
      byNorm[normalizeKey(k)] = k;
    });

    for (var j = 0; j < list.length; j += 1) {
      var norm = normalizeKey(list[j]);
      if (byNorm[norm]) {
        var realKey = byNorm[norm];

        if (
          safe[realKey] !== undefined &&
          safe[realKey] !== null &&
          asText(safe[realKey]) !== ""
        ) {
          return safe[realKey];
        }
      }
    }

    return "";
  }

  function toNumber(value) {
    if (typeof value === "number") return value;

    var txt = asText(value)
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    if (!txt) return NaN;

    return Number(txt);
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function timeToMinutes(value) {
    var txt = asText(value);

    if (!/^\d{1,2}:\d{2}$/.test(txt)) return NaN;

    var parts = txt.split(":");
    var h = Number(parts[0]);
    var m = Number(parts[1]);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;

    return h * 60 + m;
  }

  function minutesToTime(total) {
    var n = Number(total);

    if (!Number.isFinite(n)) return "";

    var h = Math.floor(n / 60);
    var m = n % 60;

    return pad2(h) + ":" + pad2(m);
  }

  function addMinutes(time, minutes) {
    var base = timeToMinutes(time);

    if (!Number.isFinite(base)) return "";

    return minutesToTime(base + Number(minutes || 0));
  }

  function parseLines(value) {
    return asText(value)
      .split(/\r?\n/)
      .map(function (x) { return asText(x); })
      .filter(Boolean);
  }

  function unique(list) {
    var out = [];
    var seen = Object.create(null);

    (Array.isArray(list) ? list : []).forEach(function (item) {
      var key = asText(item);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(item);
    });

    return out;
  }

  function compareSpanish(a, b) {
    return asText(a).localeCompare(asText(b), "es", { sensitivity: "base" });
  }

  function groupBy(list, getter) {
    var map = Object.create(null);

    (Array.isArray(list) ? list : []).forEach(function (item) {
      var key = asText(getter(item)) || "Sin grupo";

      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    return map;
  }

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fileNameSafe(value) {
    return normalizeText(value)
      .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "crono";
  }

  function downloadText(filename, content, mime) {
    var blob = new Blob([content], {
      type: mime || "text/plain;charset=utf-8"
    });

    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 250);
  }

  function formatDate(value) {
    var txt = asText(value);
    if (!txt) return "";

    var parts = txt.split("-");
    if (parts.length !== 3) return txt;

    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isVirtualSede(value) {
    return normalizeKey(value) === "virtual";
  }

  function slotKey(parts) {
    return (Array.isArray(parts) ? parts : []).map(function (x) {
      return normalizeKey(x);
    }).join("|");
  }

  function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("[CronoUtils] JSON inválido:", error);
      return fallback;
    }
  }

  window.CronoUtils = {
    asText: asText,
    normalizeText: normalizeText,
    normalizeKey: normalizeKey,
    normalizePerson: normalizePerson,
    pickFirst: pickFirst,
    toNumber: toNumber,
    pad2: pad2,
    timeToMinutes: timeToMinutes,
    minutesToTime: minutesToTime,
    addMinutes: addMinutes,
    parseLines: parseLines,
    unique: unique,
    compareSpanish: compareSpanish,
    groupBy: groupBy,
    escapeHtml: escapeHtml,
    fileNameSafe: fileNameSafe,
    downloadText: downloadText,
    formatDate: formatDate,
    nowIso: nowIso,
    isVirtualSede: isVirtualSede,
    slotKey: slotKey,
    safeJsonParse: safeJsonParse
  };
})(window);
