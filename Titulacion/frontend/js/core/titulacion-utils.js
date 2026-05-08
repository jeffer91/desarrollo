/* =========================================================
Nombre completo: titulacion-utils.js
Ruta: /Titulacion/frontend/js/core/titulacion-utils.js
Función o funciones:
- Centralizar funciones utilitarias reutilizables.
- Leer y escribir localStorage con seguridad.
- Normalizar textos, claves, nombres de archivo y carpetas.
- Manipular DOM sin repetir código en otros módulos.
========================================================= */

(function (window, document) {
  "use strict";

  function asText(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeKey(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function sanitizeFileName(value) {
    var clean = asText(value || "archivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/g, "")
      .replace(/^_+/g, "")
      .replace(/^-+/g, "")
      .trim();

    return clean || "archivo";
  }

  function sanitizeFolder(value) {
    var clean = asText(value || "sin-periodo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/g, "")
      .replace(/^_+/g, "")
      .replace(/^-+/g, "")
      .trim();

    return clean || "sin-periodo";
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function toNumber(value, fallback) {
    var number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
    return Number(fallback || 0);
  }

  function clamp(value, min, max) {
    var number = toNumber(value, min);
    return Math.min(Math.max(number, min), max);
  }

  function uid(prefix) {
    return [
      asText(prefix || "id"),
      Date.now(),
      Math.random().toString(36).slice(2, 8)
    ].join("-");
  }

  function formatDateIso(date) {
    var d = date instanceof Date ? date : new Date();
    return [
      d.getFullYear(),
      pad2(d.getMonth() + 1),
      pad2(d.getDate())
    ].join("-");
  }

  function formatDateTimeStamp(date) {
    var d = date instanceof Date ? date : new Date();
    return [
      d.getFullYear(),
      pad2(d.getMonth() + 1),
      pad2(d.getDate())
    ].join("") + "-" + [
      pad2(d.getHours()),
      pad2(d.getMinutes()),
      pad2(d.getSeconds())
    ].join("");
  }

  function formatDateLongEs(date) {
    var d = date instanceof Date ? date : new Date();
    var meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre"
    ];

    return [
      d.getDate(),
      meses[d.getMonth()],
      d.getFullYear()
    ].join("-");
  }

  function readStorage(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function setText(id, value) {
    var el = $(id);
    if (el) {
      el.textContent = asText(value);
    }
  }

  function setHtml(id, html) {
    var el = $(id);
    if (el) {
      el.innerHTML = String(html || "");
    }
  }

  function on(element, eventName, handler) {
    if (!element || !eventName || typeof handler !== "function") {
      return function () {};
    }

    element.addEventListener(eventName, handler);

    return function () {
      element.removeEventListener(eventName, handler);
    };
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  function uniqueBy(list, keyGetter) {
    var items = Array.isArray(list) ? list : [];
    var out = [];
    var seen = new Set();

    items.forEach(function (item, index) {
      var key = typeof keyGetter === "function"
        ? keyGetter(item, index)
        : JSON.stringify(item);

      if (seen.has(key)) return;

      seen.add(key);
      out.push(item);
    });

    return out;
  }

  function isImageNameOrMime(name, mime) {
    var cleanMime = asText(mime).toLowerCase();
    var cleanName = asText(name).toLowerCase();

    return (
      cleanMime.indexOf("image/") === 0 ||
      /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(cleanName)
    );
  }

  window.TITULACION_UTILS = {
    asText: asText,
    escapeHtml: escapeHtml,
    normalizeText: normalizeText,
    normalizeKey: normalizeKey,
    sanitizeFileName: sanitizeFileName,
    sanitizeFolder: sanitizeFolder,
    pad2: pad2,
    toNumber: toNumber,
    clamp: clamp,
    uid: uid,
    formatDateIso: formatDateIso,
    formatDateTimeStamp: formatDateTimeStamp,
    formatDateLongEs: formatDateLongEs,
    readStorage: readStorage,
    writeStorage: writeStorage,
    removeStorage: removeStorage,
    $: $,
    qs: qs,
    qsa: qsa,
    setText: setText,
    setHtml: setHtml,
    on: on,
    toArray: toArray,
    uniqueBy: uniqueBy,
    isImageNameOrMime: isImageNameOrMime
  };
})(window, document);