/* =========================================================
Nombre completo: memcom.tables.js
Ruta: /screens/memcom/memcom.tables.js
Función o funciones:
- Permitir seleccionar si el memorando tendrá 1, 2, 3 o 4 tablas.
- Crear dinámicamente los bloques de carga de cada tabla.
- Validar que cada tabla activa tenga título y datos pegados desde Excel.
- Procesar tablas copiadas desde Excel con tabulación, punto y coma o barra vertical.
- Devolver las tablas en formato estructurado para memcom.app.js y memcom.pdf.js.
- Guardar temporalmente los títulos y datos pegados en localStorage.
========================================================= */

(function (window, document) {
  "use strict";

  window.MEMCOM = window.MEMCOM || {};

  var STORAGE_KEY = "MEMCOM_TABLES_STATE";
  var MAX_TABLES = 4;

  var config = {
    countSelectId: "mc-num-tablas",
    containerId: "mc-tables-container",
    previewContainerId: "mc-table-preview",
    previewListId: "mc-table-preview-list",
    onChange: null
  };

  var els = {
    countSelect: null,
    container: null,
    previewContainer: null,
    previewList: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function clampCount(value) {
    var n = parseInt(value, 10);

    if (isNaN(n)) {
      return 1;
    }

    if (n < 1) {
      return 1;
    }

    if (n > MAX_TABLES) {
      return MAX_TABLES;
    }

    return n;
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\s+/g, " ");
  }

  function defaultTitle(index) {
    var titles = [
      "Tabla 1. Cronograma general",
      "Tabla 2. Cronograma complementario",
      "Tabla 3. Cronograma adicional",
      "Tabla 4. Cronograma final"
    ];

    return titles[index - 1] || "Tabla " + index + ". Cronograma";
  }

  function splitRow(line) {
    var text = String(line || "");

    if (text.indexOf("\t") !== -1) {
      return text.split("\t");
    }

    if (text.indexOf(";") !== -1) {
      return text.split(";");
    }

    if (text.indexOf("|") !== -1) {
      return text.split("|");
    }

    return [text];
  }

  function normalizeRow(row) {
    var normalized = row.map(function (cell) {
      return normalizeText(cell);
    });

    while (normalized.length < 3) {
      normalized.push("");
    }

    return normalized.slice(0, 3);
  }

  function looksLikeHeader(row) {
    var text = normalizeText(row.join(" ")).toUpperCase();

    return (
      text.indexOf("ACTIVIDAD") !== -1 ||
      text.indexOf("INICIO") !== -1 ||
      text.indexOf("FIN") !== -1 ||
      text.indexOf("FECHA") !== -1 ||
      text.indexOf("DESCRIPCIÓN") !== -1 ||
      text.indexOf("DESCRIPCION") !== -1
    );
  }

  function parseTableText(raw) {
    var text = String(raw || "").replace(/\r/g, "");

    if (!text.trim()) {
      return {
        columnas: [],
        filas: []
      };
    }

    var rows = text
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      })
      .map(function (line) {
        return normalizeRow(splitRow(line));
      })
      .filter(function (row) {
        return row.some(function (cell) {
          return normalizeText(cell).length > 0;
        });
      });

    if (rows.length === 0) {
      return {
        columnas: [],
        filas: []
      };
    }

    if (looksLikeHeader(rows[0])) {
      return {
        columnas: rows[0],
        filas: rows.slice(1)
      };
    }

    return {
      columnas: ["Actividad", "Fecha inicio", "Fecha fin"],
      filas: rows
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return {
          count: 1,
          tables: []
        };
      }

      var data = JSON.parse(raw);

      return {
        count: clampCount(data.count || 1),
        tables: Array.isArray(data.tables) ? data.tables : []
      };
    } catch (error) {
      console.error("[MEMCOM_TABLES] Error cargando estado:", error);

      return {
        count: 1,
        tables: []
      };
    }
  }

  function saveState() {
    try {
      var count = els.countSelect ? clampCount(els.countSelect.value) : 1;
      var tables = [];

      for (var i = 1; i <= count; i++) {
        var titleEl = $("mc-table-title-" + i);
        var rawEl = $("mc-table-raw-" + i);

        tables.push({
          index: i,
          titulo: titleEl ? titleEl.value : "",
          raw: rawEl ? rawEl.value : ""
        });
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          count: count,
          tables: tables
        })
      );
    } catch (error) {
      console.error("[MEMCOM_TABLES] Error guardando estado:", error);
    }
  }

  function getSavedTable(saved, index) {
    if (!saved || !Array.isArray(saved.tables)) {
      return null;
    }

    return saved.tables.find(function (item) {
      return parseInt(item.index, 10) === index;
    }) || null;
  }

  function createTableBlock(index, savedTable) {
    var block = document.createElement("article");
    block.className = "mc-table-block";
    block.setAttribute("data-table-index", String(index));

    var titleValue = savedTable && savedTable.titulo
      ? savedTable.titulo
      : defaultTitle(index);

    var rawValue = savedTable && savedTable.raw
      ? savedTable.raw
      : "";

    block.innerHTML =
      '<div class="mc-table-block__head">' +
        '<div>' +
          '<div class="mc-table-block__eyebrow">Tabla ' + index + '</div>' +
          '<h3>Datos de la tabla ' + index + '</h3>' +
        '</div>' +
      '</div>' +

      '<div class="field full-width">' +
        '<label for="mc-table-title-' + index + '">Título de la tabla ' + index + '</label>' +
        '<input id="mc-table-title-' + index + '" type="text" value="' + escapeHtml(titleValue) + '" />' +
      '</div>' +

      '<div class="field full-width">' +
        '<label for="mc-table-raw-' + index + '">Pegar datos desde Excel</label>' +
        '<textarea id="mc-table-raw-' + index + '" class="smart-area" placeholder="Copia las celdas en Excel y pégalas aquí. Ejemplo: Actividad | Fecha inicio | Fecha fin">' +
          escapeHtml(rawValue) +
        '</textarea>' +
        '<small class="help">El sistema detecta tabulaciones, punto y coma o barra vertical.</small>' +
      '</div>';

    return block;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function attachInputListeners() {
    var inputs = els.container.querySelectorAll("input, textarea");

    inputs.forEach(function (input) {
      input.addEventListener("input", function () {
        saveState();

        if (typeof config.onChange === "function") {
          config.onChange();
        }
      });
    });
  }

  function renderBlocks(count) {
    if (!els.container) {
      return;
    }

    var saved = loadState();

    els.container.innerHTML = "";

    for (var i = 1; i <= count; i++) {
      var savedTable = getSavedTable(saved, i);
      els.container.appendChild(createTableBlock(i, savedTable));
    }

    attachInputListeners();
    saveState();
  }

  function getActiveCount() {
    if (!els.countSelect) {
      return 1;
    }

    return clampCount(els.countSelect.value);
  }

  function getTables() {
    var count = getActiveCount();
    var tables = [];

    for (var i = 1; i <= count; i++) {
      var titleEl = $("mc-table-title-" + i);
      var rawEl = $("mc-table-raw-" + i);

      var titulo = normalizeText(titleEl ? titleEl.value : "");
      var raw = rawEl ? rawEl.value : "";
      var parsed = parseTableText(raw);

      if (!titulo) {
        throw new Error("Falta el título de la tabla " + i + ".");
      }

      if (!raw || !raw.trim()) {
        throw new Error("Faltan los datos de la tabla " + i + ".");
      }

      if (!parsed.columnas.length || !parsed.filas.length) {
        throw new Error("La tabla " + i + " no tiene filas válidas.");
      }

      tables.push({
        index: i,
        titulo: titulo,
        columnas: parsed.columnas,
        filas: parsed.filas,
        raw: raw
      });
    }

    if (tables.length < 1) {
      throw new Error("Debe existir al menos una tabla.");
    }

    if (tables.length > MAX_TABLES) {
      throw new Error("Solo se permiten hasta 4 tablas por memorando.");
    }

    return tables;
  }

  function clearPreview() {
    if (els.previewList) {
      els.previewList.innerHTML = "";
    }

    if (els.previewContainer) {
      els.previewContainer.hidden = true;
    }
  }

  function renderPreview(tables) {
    if (!els.previewList || !els.previewContainer) {
      return;
    }

    els.previewList.innerHTML = "";

    tables.forEach(function (tabla) {
      var section = document.createElement("section");
      section.className = "preview-table-section";

      var title = document.createElement("h4");
      title.textContent = tabla.titulo;
      section.appendChild(title);

      var table = document.createElement("table");
      table.className = "preview-table";

      var thead = document.createElement("thead");
      var trHead = document.createElement("tr");

      tabla.columnas.forEach(function (columna) {
        var th = document.createElement("th");
        th.textContent = columna;
        trHead.appendChild(th);
      });

      thead.appendChild(trHead);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");

      tabla.filas.forEach(function (fila) {
        var tr = document.createElement("tr");

        fila.forEach(function (cell) {
          var td = document.createElement("td");
          td.textContent = cell;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      section.appendChild(table);
      els.previewList.appendChild(section);
    });

    els.previewContainer.hidden = false;
  }

  function init(options) {
    config = Object.assign({}, config, options || {});

    els.countSelect = $(config.countSelectId);
    els.container = $(config.containerId);
    els.previewContainer = $(config.previewContainerId);
    els.previewList = $(config.previewListId);

    var saved = loadState();
    var initialCount = clampCount(saved.count || 1);

    if (els.countSelect) {
      els.countSelect.value = String(initialCount);

      els.countSelect.addEventListener("change", function () {
        var count = clampCount(els.countSelect.value);
        els.countSelect.value = String(count);
        renderBlocks(count);
        clearPreview();

        if (typeof config.onChange === "function") {
          config.onChange();
        }
      });
    }

    renderBlocks(initialCount);

    return api;
  }

  var api = {
    init: init,
    getTables: getTables,
    renderPreview: renderPreview,
    clearPreview: clearPreview,
    saveState: saveState,
    parseTableText: parseTableText
  };

  window.MEMCOM.tables = api;
})(window, document);