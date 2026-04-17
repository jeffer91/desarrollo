/*
Nombre completo: ctl.ui.js
Ruta o ubicación: /control/ctl.ui.js
Función o funciones:
- Manejar la interfaz del módulo
- Llenar filtros de carrera y nivel
- Leer filtros activos
- Limpiar filtros
- Mostrar mensajes de estado
*/

function ctlSafeText(value) {
  return String(value ?? "").trim();
}

function ctlFillSelect(selectId, items, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder || "Todos";
  select.appendChild(first);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = ctlSafeText(item.id);
    option.textContent = ctlSafeText(item.nombre || item.label || item.id);
    select.appendChild(option);
  });
}

function ctlUiBindCatalogos(catalogos) {
  ctlFillSelect("ctlFiltroCarrera", catalogos?.carreras || [], "Todas");
  ctlFillSelect("ctlFiltroNivel", catalogos?.niveles || [], "Todos");
}

function ctlUiReadFiltros() {
  return {
    carreraId: ctlSafeText(document.getElementById("ctlFiltroCarrera")?.value),
    nivelId: ctlSafeText(document.getElementById("ctlFiltroNivel")?.value),
    estado: ctlSafeText(document.getElementById("ctlFiltroEstado")?.value),
    texto: ctlSafeText(document.getElementById("ctlBuscarTexto")?.value)
  };
}

function ctlUiResetFiltros() {
  ["ctlFiltroCarrera", "ctlFiltroNivel", "ctlFiltroEstado", "ctlBuscarTexto"].forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.value = "";
  });
}

function ctlUiSetEstado(message, type = "normal") {
  const node = document.getElementById("ctlEstado");
  if (!node) return;

  node.textContent = ctlSafeText(message);
  node.classList.remove("ctl-status-ok", "ctl-status-error");

  if (type === "ok") {
    node.classList.add("ctl-status-ok");
  }

  if (type === "error") {
    node.classList.add("ctl-status-error");
  }
}

export {
  ctlUiBindCatalogos,
  ctlUiReadFiltros,
  ctlUiResetFiltros,
  ctlUiSetEstado
};