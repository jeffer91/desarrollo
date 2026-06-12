/*
=========================================================
Nombre completo: coordi.table.js
Ruta o ubicación: /Docentes/coordi/coordi.table.js
Función o funciones:
- Renderizar la tabla editable tipo Excel de Coordi.
- Permitir edición directa de Carrera, Coordinador, Programa y Telegram.
- Permitir eliminar filas.
- Aplicar estilos visuales a celdas con errores.
Con qué se une:
- coordi.index.html
- coordi.dom.js
- coordi.state.js
- coordi.validate.js
- coordi.app.js
=========================================================
*/

(function () {
  "use strict";

  const FIELDS = ["carrera", "coordinador", "programa", "telegram"];

  function render(rows, options = {}) {
    const elements = window.CoordiDOM.getElements();
    const tableBody = elements.tableBody;

    if (!tableBody) {
      return;
    }

    const filterText = window.CoordiState.getFilterText();
    const invalidCellMap = options.invalidCellMap || new Map();
    const visibleRows = filterRows(rows, filterText);

    window.CoordiDOM.setRowCounter(rows.length, visibleRows.length);

    if (visibleRows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td class="empty-row" colspan="6">
            No hay registros para mostrar.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = visibleRows
      .map((row, index) => buildRowHtml(row, index, invalidCellMap))
      .join("");

    bindTableEvents(tableBody);
  }

  function filterRows(rows, filterText) {
    const text = String(filterText || "").trim();

    if (!text) {
      return rows;
    }

    const key = window.CoordiNormalize
      ? window.CoordiNormalize.toKey(text)
      : text.toLowerCase();

    return rows.filter((row) => {
      const content = [
        row.carrera,
        row.coordinador,
        row.programa,
        row.telegram
      ].join(" ");

      const contentKey = window.CoordiNormalize
        ? window.CoordiNormalize.toKey(content)
        : content.toLowerCase();

      return contentKey.includes(key);
    });
  }

  function buildRowHtml(row, index, invalidCellMap) {
    const cells = FIELDS.map((field) => {
      const invalid = invalidCellMap.has(`${row.id}:${field}`) ? "invalid" : "";
      const value = window.CoordiDOM.escapeHtml(row[field] || "");

      return `
        <td>
          <input
            class="coordi-cell-input ${invalid}"
            type="text"
            value="${value}"
            data-row-id="${row.id}"
            data-field="${field}"
            autocomplete="off"
          />
        </td>
      `;
    }).join("");

    return `
      <tr data-row-id="${row.id}">
        <td class="row-number">${index + 1}</td>
        ${cells}
        <td>
          <div class="row-actions">
            <button
              class="icon-btn delete"
              type="button"
              title="Eliminar fila"
              data-action="delete"
              data-row-id="${row.id}"
            >
              ×
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function bindTableEvents(tableBody) {
    tableBody.querySelectorAll(".coordi-cell-input").forEach((input) => {
      input.addEventListener("input", handleCellInput);
      input.addEventListener("blur", handleCellBlur);
    });

    tableBody.querySelectorAll("[data-action='delete']").forEach((button) => {
      button.addEventListener("click", handleDeleteRow);
    });
  }

  function handleCellInput(event) {
    const input = event.currentTarget;
    const rowId = input.dataset.rowId;
    const field = input.dataset.field;

    window.CoordiState.updateRow(rowId, field, input.value);
    window.CoordiDOM.setSaveStatus("Cambios pendientes", "warning");
  }

  function handleCellBlur(event) {
    const input = event.currentTarget;

    if (input.dataset.field === "telegram" && window.CoordiNormalize) {
      const formatted = window.CoordiNormalize.normalizeTelegram(input.value);
      input.value = formatted;
      window.CoordiState.updateRow(input.dataset.rowId, "telegram", formatted);
    }
  }

  function handleDeleteRow(event) {
    const rowId = event.currentTarget.dataset.rowId;
    const confirmed = confirm("¿Deseas eliminar esta fila de Coordi?");

    if (!confirmed) {
      return;
    }

    window.CoordiState.deleteRow(rowId);
    render(window.CoordiState.getRows());
    window.CoordiDOM.setSaveStatus("Cambios pendientes", "warning");
  }

  window.CoordiTable = {
    render,
    filterRows
  };
})();