/* =========================================================
Nombre del archivo: menu.render.js
Ruta o ubicación: /Curriculo/menu/menu.render.js
Función o funciones:
- Renderiza visualmente los botones del menú Currículo
- Marca la opción activa según el módulo seleccionado
- Actualiza el hint de estado del shell
- Se integra con el router y el frame principal
========================================================= */

(function attachCurriculoMenuRender(window, document) {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderNav(items, activeId) {
    var nav = byId("menuNav");
    if (!nav) return;

    nav.innerHTML = items.map(function mapItem(item) {
      var isActive = String(item.id) === String(activeId);
      return [
        '<button class="navbtn" type="button" data-id="',
        escapeHtml(item.id),
        '" data-active="',
        isActive ? "true" : "false",
        '" title="',
        escapeHtml(item.hint || item.title || ""),
        '">',
        escapeHtml(item.title || ""),
        "</button>"
      ].join("");
    }).join("");
  }

  function setHint(text) {
    var hint = byId("menuHint");
    if (!hint) return;
    hint.textContent = text || "Listo.";
  }

  window.CurriculoMenuRender = {
    renderNav: renderNav,
    setHint: setHint
  };
})(window, document);