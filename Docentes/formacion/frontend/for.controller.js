/*
Nombre completo: for.controller.js
Ruta o ubicación: formacion/frontend/for.controller.js
Función o funciones: Inicializar la pantalla del módulo Formación, coordinar filtros, tabla, modal, creación, guardado y exportación por registro mediante menú contextual
*/

import {
  forSetRecords,
  forGetRecords,
  forSetFilteredRecords,
  forGetFilteredRecords,
  forSetFilter,
  forGetFilters
} from "./for.state.js";
import { forApplyFilters } from "./for.filters.js";
import { forRenderTable } from "./for.table.render.js";
import { forToastSuccess, forToastInfo, forToastError } from "./for.alerts.js";
import { forCreateModalController } from "./for.modal.js";
import { forCreateExportMenu } from "./for.export.menu.js";
import {
  forLoadRecordsAction,
  forOpenRecordAction,
  forCreateRecordAction,
  forSaveRecordAction,
  forExportRecordPdfAction,
  forExportRecordWordAction
} from "./for.actions.js";

let forModalController = null;
let forExportMenu = null;

function forRefreshTable() {
  const filtered = forApplyFilters(forGetRecords(), forGetFilters());
  forSetFilteredRecords(filtered);

  forRenderTable(forGetFilteredRecords(), {
    onView: async recordId => {
      const record = await forOpenRecordAction(recordId);
      if (!record) {
        forToastError("No se pudo cargar el registro seleccionado.");
        return;
      }
      forModalController?.open(record);
    },
    onEdit: async recordId => {
      const record = await forOpenRecordAction(recordId);
      if (!record) {
        forToastError("No se pudo cargar el registro seleccionado.");
        return;
      }
      forModalController?.open(record);
    }
  });

  forInjectExportButtons();
}

function forInjectExportButtons() {
  const rows = document.querySelectorAll("#forTableBody tr[data-id]");

  rows.forEach(row => {
    const actionsWrap = row.querySelector(".forActions");
    if (!actionsWrap) return;

    const exists = actionsWrap.querySelector(`[data-role="for-export-trigger"]`);
    if (exists) return;

    const recordId = row.dataset.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "forMiniBtn forMiniBtnBrand";
    button.dataset.role = "for-export-trigger";
    button.textContent = "Exportar";

    button.addEventListener("click", event => {
      forExportMenu?.toggle({
        anchorEl: event.currentTarget,
        recordId
      });
    });

    actionsWrap.appendChild(button);
  });
}

function forSyncSearchSelector(records) {
  const search = document.getElementById("forSearchInput");
  if (!search) return;

  let list = document.getElementById("forSearchDocentes");
  if (!list) {
    list = document.createElement("datalist");
    list.id = "forSearchDocentes";
    document.body.appendChild(list);
  }

  search.setAttribute("list", "forSearchDocentes");

  const docentes = [...new Set(
    (Array.isArray(records) ? records : [])
      .map(record => String(record?.docente ?? "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const renderOptions = value => {
    const query = String(value ?? "").trim().toLowerCase();
    const matches = docentes
      .filter(docente => !query || docente.toLowerCase().includes(query))
      .slice(0, 4); // Corrige el límite del desplegable para mostrar solo 4 coincidencias útiles.

    list.innerHTML = "";

    matches.forEach(docente => {
      const option = document.createElement("option");
      option.value = docente;
      list.appendChild(option);
    });
  };

  if (search._forSearchHandler) {
    search.removeEventListener("input", search._forSearchHandler);
    search.removeEventListener("focus", search._forSearchHandler);
  }

  search._forSearchHandler = event => {
    // Corrige el refresco dinámico del datalist para que responda a lo que el usuario escribe.
    renderOptions(event.currentTarget.value);
  };

  search.addEventListener("input", search._forSearchHandler);
  search.addEventListener("focus", search._forSearchHandler);

  renderOptions(search.value);
}

async function forLoadAndRender() {
  const records = await forLoadRecordsAction();
  forSetRecords(records);
  forSyncSearchSelector(records);
  forRefreshTable();
}

function forBindFilters() {
  const map = [
    ["forSearchInput", "search"],
    ["forStatusFilter", "status"],
    ["forModeFilter", "mode"],
    ["forCareerFilter", "career"]
  ];

  map.forEach(([id, key]) => {
    const node = document.getElementById(id);
    if (!node) return;

    const handler = event => {
      forSetFilter(key, event.currentTarget.value);
      forRefreshTable();
    };

    node.addEventListener("input", handler);
    node.addEventListener("change", handler);
  });
}

function forClearFilters() {
  const search = document.getElementById("forSearchInput");
  const status = document.getElementById("forStatusFilter");
  const mode = document.getElementById("forModeFilter");
  const career = document.getElementById("forCareerFilter");

  if (search) search.value = "";
  if (status) status.value = "";
  if (mode) mode.value = "";
  if (career) career.value = "";

  forSetFilter("search", "");
  forSetFilter("status", "");
  forSetFilter("mode", "");
  forSetFilter("career", "");

  forRefreshTable();
}

function forBindTopActions() {
  document.getElementById("forRefreshBtn")?.addEventListener("click", async () => {
    await forLoadAndRender();
    forToastInfo("Datos recargados.");
  });

  document.getElementById("forNewBtn")?.addEventListener("click", async () => {
    const emptyRecord = await forCreateRecordAction();
    forModalController?.open(emptyRecord);
  });

  document.getElementById("forClearFiltersBtn")?.addEventListener("click", () => {
    forClearFilters();
    forToastInfo("Filtros reiniciados.");
  });
}

function forCreateModal() {
  forModalController = forCreateModalController({
    onSave: async nextRecord => {
      const result = await forSaveRecordAction(nextRecord);

      if (!result.ok) {
        throw new Error(result.errors?.join(" | ") || "No se pudo guardar el registro.");
      }

      await forLoadAndRender();
      forToastSuccess("Registro guardado correctamente.");
    }
  });
}

function forCreateExportDropdown() {
  forExportMenu = forCreateExportMenu({
    onPdf: async recordId => {
      try {
        const result = await forExportRecordPdfAction(recordId);
        if (!result.ok) {
          forToastError(result.message || "No se pudo exportar el PDF.");
          return;
        }
        forToastSuccess("PDF generado correctamente.");
      } catch (error) {
        console.error(error);
        forToastError("Ocurrió un error al exportar el PDF.");
      }
    },
    onWord: async recordId => {
      try {
        const result = await forExportRecordWordAction(recordId);
        if (!result.ok) {
          forToastError(result.message || "No se pudo exportar el Word.");
          return;
        }
        forToastSuccess("Word generado correctamente.");
      } catch (error) {
        console.error(error);
        forToastError("Ocurrió un error al exportar el Word.");
      }
    }
  });
}

async function forInit() {
  try {
    forCreateModal();
    forCreateExportDropdown();
    forBindFilters();
    forBindTopActions();
    await forLoadAndRender();
  } catch (error) {
    console.error(error);
    forToastError("Ocurrió un problema al iniciar el módulo de formación.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void forInit();
});