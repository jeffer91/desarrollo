// =========================================================
// INICIA ARCHIVO: falt.utils.js
// RUTA O UBICACIÓN: /incorporaciones/falt/falt.utils.js
// FUNCIÓN O FUNCIONES:
// - Centralizar funciones utilitarias del módulo Falt.
// - Normalizar texto, nombres de columnas, teléfonos, cédulas y carreras.
// - Obtener datos de estudiante sin depender de un único nombre de columna.
// - Copiar texto al portapapeles.
// CON QUÉ SE CONECTA:
// - falt.data.js
// - falt.filters.js
// - falt.message.js
// - falt.whatsapp.js
// - falt.telegram.js
// - falt.table.js
// - falt.app.js
// =========================================================
(function (window, document) {
  "use strict";

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function removeAccents(value) {
    return asText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalizeText(value) {
    return removeAccents(value)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeKey(value) {
    return removeAccents(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function makeKeyMap(row) {
    var map = {};
    Object.keys(row || {}).forEach(function (key) {
      map[normalizeKey(key)] = row[key];
    });
    return map;
  }

  function getFirstValue(row, candidates) {
    var item = row || {};
    var keys = Array.isArray(candidates) ? candidates : [candidates];
    var map = makeKeyMap(item);

    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];

      if (Object.prototype.hasOwnProperty.call(item, key)) {
        return item[key];
      }

      var normalized = normalizeKey(key);
      if (Object.prototype.hasOwnProperty.call(map, normalized)) {
        return map[normalized];
      }
    }

    return "";
  }

  function getConfig() {
    return window.FaltConfig || { campos: {}, palabras: {} };
  }

  function getCedula(row) {
    return asText(getFirstValue(row, getConfig().campos.cedula));
  }

  function getCarrera(row) {
    return asText(getFirstValue(row, getConfig().campos.carrera));
  }

  function getPeriodo(row, fallback) {
    return asText(getFirstValue(row, getConfig().campos.periodo)) || asText(fallback);
  }

  function getNombres(row) {
    var cfg = getConfig();
    var nombreDirecto = asText(getFirstValue(row, cfg.campos.nombres));
    var apellidos = asText(getFirstValue(row, cfg.campos.apellidos));

    if (nombreDirecto && apellidos && !normalizeText(nombreDirecto).includes(normalizeText(apellidos))) {
      return (nombreDirecto + " " + apellidos).trim();
    }

    return nombreDirecto || "Estudiante";
  }

  function getStudentId(row) {
    var cfg = getConfig();
    var id = asText(getFirstValue(row, cfg.campos.id));

    if (id) return id;

    var cedula = getCedula(row);
    if (cedula) return cedula;

    return normalizeKey(getNombres(row) + "-" + getCarrera(row));
  }

  function getPhone(row) {
    return asText(getFirstValue(row, getConfig().campos.telefono));
  }

  function getTelegram(row) {
    return asText(getFirstValue(row, getConfig().campos.telegram));
  }

  function cleanPhone(value) {
    var raw = asText(value);
    if (!raw) return "";

    var digits = raw.replace(/[^\d+]/g, "");
    digits = digits.replace(/^00/, "+");

    if (digits.indexOf("+") === 0) {
      return digits.replace(/[^\d]/g, "");
    }

    var onlyDigits = digits.replace(/[^\d]/g, "");

    if (onlyDigits.length === 10 && onlyDigits.indexOf("0") === 0) {
      return "593" + onlyDigits.substring(1);
    }

    if (onlyDigits.length === 9 && onlyDigits.indexOf("9") === 0) {
      return "593" + onlyDigits;
    }

    return onlyDigits;
  }

  function getNumeroPendientes(row) {
    var value = getFirstValue(row, getConfig().campos.cantidadPendientes);
    var number = Number(String(value).replace(",", "."));

    if (Number.isFinite(number)) return number;

    var list = getListaPendientes(row);
    return list.length;
  }

  function getListaPendientes(row) {
    var raw = getFirstValue(row, getConfig().campos.requisitosPendientes);

    if (Array.isArray(raw)) {
      return raw.map(asText).filter(Boolean);
    }

    var text = asText(raw);
    if (!text) return [];

    return text
      .split(/[,;|]/)
      .map(asText)
      .filter(Boolean);
  }

  function isTruthyWord(value) {
    var text = normalizeText(value);
    if (!text) return false;

    return (getConfig().palabras.afirmativas || []).some(function (word) {
      return text === normalizeText(word) || text.includes(normalizeText(word));
    });
  }

  function isFalsyWord(value) {
    var text = normalizeText(value);
    if (!text) return false;

    return (getConfig().palabras.negativas || []).some(function (word) {
      return text === normalizeText(word) || text.includes(normalizeText(word));
    });
  }

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function copyToClipboard(text) {
    var value = asText(text);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";

    document.body.appendChild(textarea);
    textarea.select();

    var ok = document.execCommand("copy");
    document.body.removeChild(textarea);

    return ok;
  }

  function formatDate(value) {
    var date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      date = new Date();
    }

    return date.toLocaleString("es-EC", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function sortText(a, b) {
    return normalizeText(a).localeCompare(normalizeText(b), "es");
  }

  function uniqueSorted(values) {
    var map = {};
    (values || []).forEach(function (value) {
      var text = asText(value);
      if (text) map[normalizeText(text)] = text;
    });

    return Object.keys(map)
      .map(function (key) {
        return map[key];
      })
      .sort(sortText);
  }

  window.FaltUtils = {
    asText: asText,
    removeAccents: removeAccents,
    normalizeText: normalizeText,
    normalizeKey: normalizeKey,
    getFirstValue: getFirstValue,
    getCedula: getCedula,
    getCarrera: getCarrera,
    getPeriodo: getPeriodo,
    getNombres: getNombres,
    getStudentId: getStudentId,
    getPhone: getPhone,
    getTelegram: getTelegram,
    cleanPhone: cleanPhone,
    getNumeroPendientes: getNumeroPendientes,
    getListaPendientes: getListaPendientes,
    isTruthyWord: isTruthyWord,
    isFalsyWord: isFalsyWord,
    escapeHtml: escapeHtml,
    copyToClipboard: copyToClipboard,
    formatDate: formatDate,
    sortText: sortText,
    uniqueSorted: uniqueSorted
  };
})(window, document);
// =========================================================
// FINALIZA ARCHIVO: falt.utils.js
// =========================================================