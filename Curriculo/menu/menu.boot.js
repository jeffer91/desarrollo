/* =========================================================
Nombre del archivo: menu.boot.js
Ruta o ubicación: /Curriculo/menu/menu.boot.js
Función o funciones:
- Inicializa el menú Currículo
- Conecta configuración, router, render y frame
- Carga Carrera por defecto
- Permite refrescar la vista actual y navegar por menú
========================================================= */

(function bootCurriculoMenu(window, document) {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function getConfig() {
    return window.CurriculoMenuConfig || {
      appTitle: "Currículo",
      defaultItemId: "",
      items: []
    };
  }

  function getItems() {
    var cfg = getConfig();
    return Array.isArray(cfg.items) ? cfg.items.slice() : [];
  }

  function getItemById(id) {
    var wanted = String(id || "").trim().toLowerCase();
    return getItems().find(function findItem(item) {
      return String(item.id || "").trim().toLowerCase() === wanted;
    }) || null;
  }

  function setFrameSrc(frame, item) {
    if (!frame || !item || !item.routeFromMenu) return;
    frame.src = String(item.routeFromMenu);
  }

  function start() {
    var Router = window.CurriculoMenuRouter;
    var Render = window.CurriculoMenuRender;
    var cfg = getConfig();

    if (!Router || !Render) {
      throw new Error("No se encontraron los módulos del menú Currículo.");
    }

    var frame = byId("menuFrame");
    var brandBtn = byId("menuBrandBtn");
    var refreshBtn = byId("menuRefresh");
    var nav = byId("menuNav");

    var currentItemId = "";

    function syncView(nextId) {
      var wantedId = Router.normalizeId(nextId || cfg.defaultItemId || "");
      var item = getItemById(wantedId) || getItemById(cfg.defaultItemId);

      if (!item) {
        Render.renderNav(getItems(), "");
        Render.setHint("No hay módulos configurados.");
        return;
      }

      currentItemId = item.id;
      Render.renderNav(getItems(), currentItemId);
      Render.setHint("Listo. Inicio: " + item.title);
      setFrameSrc(frame, item);
    }

    Router.init(function onRouteChange(routeId) {
      var nextId = routeId || cfg.defaultItemId || "";
      if (!nextId) return;
      syncView(nextId);
    });

    if (!Router.getCurrentId() && cfg.defaultItemId) {
      Router.go(cfg.defaultItemId);
    }

    nav.addEventListener("click", function onNavClick(event) {
      var button = event.target && event.target.closest
        ? event.target.closest("button[data-id]")
        : null;

      if (!button) return;

      var id = button.getAttribute("data-id") || "";
      if (!id) return;

      Router.go(id);
    });

    refreshBtn.addEventListener("click", function onRefreshClick() {
      if (!frame) return;
      try {
        if (frame.contentWindow && frame.contentWindow.location) {
          frame.contentWindow.location.reload();
          Render.setHint("Vista actual refrescada.");
          return;
        }
      } catch (error) {
        /* fallback */
      }

      if (currentItemId) {
        syncView(currentItemId);
        Render.setHint("Vista actual refrescada.");
      }
    });

    brandBtn.addEventListener("click", function onBrandClick() {
      if (cfg.defaultItemId) {
        Router.go(cfg.defaultItemId);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", start);
})(window, document);