/*
Nombre completo: ctl.main.js
Ruta o ubicación: /control/ctl.main.js
Función o funciones:
- Inicializar el módulo de control
- Cargar catálogos y datos consolidados
- Aplicar filtros
- Calcular estadísticas
- Renderizar el resumen global y el detalle por carrera
*/

import {
  ctlCreateInitialState,
  ctlSetCatalogos,
  ctlSetItems,
  ctlSetFiltros,
  ctlSetFilteredItems
} from "./ctl.state.js";
import {
  ctlUiBindCatalogos,
  ctlUiReadFiltros,
  ctlUiResetFiltros,
  ctlUiSetEstado
} from "./ctl.ui.js";
import {
  ctlServiceGetCatalogos,
  ctlServiceLoadControlItems
} from "./ctl.service.js";
import {
  ctlFilterItems
} from "./ctl.filters.js";
import {
  ctlBuildGlobalStats,
  ctlBuildCarreraStats
} from "./ctl.stats.js";
import {
  ctlRenderGlobalSummary
} from "./ctl.render.global.js";
import {
  ctlRenderCarreraSummary,
  ctlRenderMateriaDetail
} from "./ctl.render.carrera.js";

let ctlState = ctlCreateInitialState();

async function ctlLoadCatalogos() {
  const catalogos = await ctlServiceGetCatalogos();
  ctlState = ctlSetCatalogos(ctlState, catalogos);
  ctlUiBindCatalogos(ctlState.catalogos);
}

async function ctlLoadItems() {
  const items = await ctlServiceLoadControlItems();
  ctlState = ctlSetItems(ctlState, items);
  ctlState = ctlSetFilteredItems(ctlState, items);
}

function ctlRenderAll() {
  const globalStats = ctlBuildGlobalStats(ctlState.filteredItems);
  const carreraStats = ctlBuildCarreraStats(ctlState.filteredItems);

  ctlRenderGlobalSummary(globalStats);
  ctlRenderCarreraSummary(carreraStats);
  ctlRenderMateriaDetail(ctlState.filteredItems);
}

function ctlApplyFilters() {
  const filtros = ctlUiReadFiltros();
  ctlState = ctlSetFiltros(ctlState, filtros);

  const filtered = ctlFilterItems(ctlState.items, ctlState.filtros);
  ctlState = ctlSetFilteredItems(ctlState, filtered);

  ctlRenderAll();
  ctlUiSetEstado(`Se aplicaron filtros. Registros visibles: ${filtered.length}.`, "ok");
}

function ctlHandleLimpiar() {
  ctlUiResetFiltros();
  ctlState = ctlSetFiltros(ctlState, {
    carreraId: "",
    nivelId: "",
    estado: "",
    texto: ""
  });
  ctlState = ctlSetFilteredItems(ctlState, ctlState.items);
  ctlRenderAll();
  ctlUiSetEstado("Filtros limpiados.");
}

async function ctlHandleRecargar() {
  try {
    ctlUiSetEstado("Recargando información...");
    await ctlLoadItems();
    ctlApplyFilters();
    ctlUiSetEstado("Información recargada correctamente.", "ok");
  } catch (error) {
    console.error("[ctl] Error al recargar:", error);
    ctlUiSetEstado("No se pudo recargar la información.", "error");
  }
}

function ctlRegisterEvents() {
  const btnAplicar = document.getElementById("ctlBtnAplicar");
  const btnLimpiar = document.getElementById("ctlBtnLimpiar");
  const btnRecargar = document.getElementById("ctlBtnRecargar");
  const buscar = document.getElementById("ctlBuscarTexto");

  if (btnAplicar) {
    btnAplicar.addEventListener("click", ctlApplyFilters);
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", ctlHandleLimpiar);
  }

  if (btnRecargar) {
    btnRecargar.addEventListener("click", ctlHandleRecargar);
  }

  if (buscar) {
    buscar.addEventListener("input", ctlApplyFilters);
  }
}

async function ctlInit() {
  try {
    ctlRegisterEvents();
    await ctlLoadCatalogos();
    await ctlLoadItems();
    ctlRenderAll();
    ctlUiSetEstado("Módulo de control listo.");
  } catch (error) {
    console.error("[ctl] Error de inicialización:", error);
    ctlUiSetEstado("No se pudo inicializar el módulo de control.", "error");
  }
}

document.addEventListener("DOMContentLoaded", ctlInit);