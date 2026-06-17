/*
Nombre del archivo: stats.tables.js
Ruta: stats/frontend/stats.tables.js
Función:
- Provee utilidades reutilizables para construir tablas HTML
- Genera tarjetas de tabla con encabezado y estado vacío
- Permite filas interactivas con atributos por fila
*/
(function attachStatsTables(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asText(value) {
    return value == null ? "" : String(value);
  }

  function escapeHtml(value) {
    if (window.STATS.UI && typeof window.STATS.UI.escapeHtml === "function") {
      return window.STATS.UI.escapeHtml(value);
    }

    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildEmpty(message) {
    return '<div class="stats-empty">' + escapeHtml(message || "Sin datos para mostrar.") + "</div>";
  }

  function attrsToString(attrs) {
    var safeAttrs = attrs && typeof attrs === "object" ? attrs : {};
    var keys = Object.keys(safeAttrs);

    return keys.map(function eachKey(key) {
      var value = safeAttrs[key];

      if (value === false || value == null) {
        return "";
      }

      if (value === true) {
        return key;
      }

      return key + '="' + escapeHtml(value) + '"';
    }).filter(Boolean).join(" ");
  }

  function normalizeRows(rows, headerCount) {
    var safeRows = asArray(rows);

    return safeRows.map(function eachRow(row) {
      var cells = asArray(row).slice();

      while (cells.length < headerCount) {
        cells.push("");
      }

      return cells;
    });
  }

  function buildTable(headers, rows, options) {
    var safeHeaders = asArray(headers);
    var safeRows = normalizeRows(rows, safeHeaders.length);
    var settings = options && typeof options === "object" ? options : {};
    var rowAttributes = asArray(settings.rowAttributes);
    var rowClass = asText(settings.rowClass || "");
    var tableClass = "stats-table" + (settings.compact ? " stats-table-compact" : "");

    if (!safeRows.length) {
      return buildEmpty(settings.emptyMessage || "Sin filas para mostrar.");
    }

    return [
      '<div class="stats-table-wrap">',
      '<table class="', tableClass, '">',
      "<thead>",
      "<tr>",
      safeHeaders.map(function eachHeader(header) {
        return "<th>" + escapeHtml(header) + "</th>";
      }).join(""),
      "</tr>",
      "</thead>",
      "<tbody>",
      safeRows.map(function eachRow(row, index) {
        var attrs = rowAttributes[index] && typeof rowAttributes[index] === "object"
          ? rowAttributes[index]
          : {};
        var rowAttrsText = attrsToString(attrs);
        var classText = rowClass ? ' class="' + escapeHtml(rowClass) + '"' : "";

        return [
          "<tr",
          classText,
          rowAttrsText ? " " + rowAttrsText : "",
          ">",
          row.map(function eachCell(cell) {
            return "<td>" + escapeHtml(cell) + "</td>";
          }).join(""),
          "</tr>"
        ].join("");
      }).join(""),
      "</tbody>",
      "</table>",
      "</div>"
    ].join("");
  }

  function buildTableCard(title, subtitle, headers, rows, options) {
    var settings = options && typeof options === "object" ? options : {};
    var tableHtml = buildTable(headers, rows, settings);

    return [
      '<div class="stats-table-card">',
      '<div class="stats-table-card-header">',
      '<h3 class="stats-table-card-title">', escapeHtml(title || "Tabla"), "</h3>",
      subtitle ? '<p class="stats-table-card-subtitle">' + escapeHtml(subtitle) + "</p>" : "",
      "</div>",
      tableHtml,
      "</div>"
    ].join("");
  }

  window.STATS.Tables = {
    asArray: asArray,
    asText: asText,
    escapeHtml: escapeHtml,
    attrsToString: attrsToString,
    buildEmpty: buildEmpty,
    buildTable: buildTable,
    buildTableCard: buildTableCard
  };
})(window);