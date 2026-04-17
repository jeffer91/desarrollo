/*
Nombre completo: ctl.state.js
Ruta o ubicación: /control/ctl.state.js
Función o funciones:
- Crear el estado base del módulo de control
- Guardar catálogos, filtros y registros consolidados
- Mantener la lista filtrada separada de la lista total
*/

function ctlClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ctlCreateInitialState() {
  return {
    catalogos: {
      carreras: [],
      niveles: []
    },
    filtros: {
      carreraId: "",
      nivelId: "",
      estado: "",
      texto: ""
    },
    items: [],
    filteredItems: []
  };
}

function ctlSetCatalogos(state, catalogos) {
  const next = ctlClone(state);
  next.catalogos = {
    carreras: Array.isArray(catalogos?.carreras) ? catalogos.carreras : [],
    niveles: Array.isArray(catalogos?.niveles) ? catalogos.niveles : []
  };
  return next;
}

function ctlSetItems(state, items) {
  const next = ctlClone(state);
  next.items = Array.isArray(items) ? items : [];
  return next;
}

function ctlSetFiltros(state, filtros) {
  const next = ctlClone(state);
  next.filtros = {
    carreraId: String(filtros?.carreraId || "").trim(),
    nivelId: String(filtros?.nivelId || "").trim(),
    estado: String(filtros?.estado || "").trim(),
    texto: String(filtros?.texto || "").trim()
  };
  return next;
}

function ctlSetFilteredItems(state, items) {
  const next = ctlClone(state);
  next.filteredItems = Array.isArray(items) ? items : [];
  return next;
}

export {
  ctlCreateInitialState,
  ctlSetCatalogos,
  ctlSetItems,
  ctlSetFiltros,
  ctlSetFilteredItems
};