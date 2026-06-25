/* =========================================================
Nombre completo: menu.boot.js
Ruta o ubicación: /menu/menu.boot.js
Función o funciones:
- Inicializar el menú Currículo
- Conectar configuración, router, render y frame principal
- Cargar el módulo por defecto
- Permitir refrescar la vista actual
- Actualizar el hint según el módulo activo
- Manejar errores de carga del iframe
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

  function getDefaultItem() {
    var cfg = getConfig();
    return getItemById(cfg.defaultItemId) || getItems()[0] || null;
  }

  function getFrame() {
    return byId("menuFrame");
  }

  function getRouter() {
    return window.CurriculoMenuRouter;
  }

  function getRender() {
    return window.CurriculoMenuRender;
  }

  function loadItem(item) {
    var frame = getFrame();
    var Render = getRender();

    if (!frame || !item) {
      return;
    }

    frame.src = item.routeFromMenu;

    if (Render && typeof Render.setHint === "function") {
      Render.setHint(item.hint || "Cargando módulo...");
    }
  }

  function render(activeId) {
    var Render = getRender();
    if (!Render || typeof Render.renderNav !== "function") {
      return;
    }

    Render.renderNav(getItems(), activeId);
  }

  function selectItem(id, options) {
    var Router = getRouter();
    var item = getItemById(id) || getDefaultItem();

    if (!item) {
      return;
    }

    render(item.id);
    loadItem(item);

    if (!options || options.syncHash !== false) {
      if (Router && typeof Router.go === "function") {
        Router.go(item.id, { replace: Boolean(options && options.replace) });
      }
    }
  }

  function refreshCurrent() {
    var frame = getFrame();
    var Render = getRender();

    if (frame && frame.src) {
      frame.src = frame.src;
    }

    if (Render && typeof Render.setHint === "function") {
      Render.setHint("Vista actual refrescada.");
    }
  }

  function bindNavClicks() {
    var nav = byId("menuNav");
    if (!nav) return;

    nav.addEventListener("click", function onNavClick(event) {
      var button = event.target.closest("button[data-menu-id]");
      if (!button) return;

      var id = button.getAttribute("data-menu-id");
      selectItem(id);
    });
  }

  function bindRefresh() {
    var btn = byId("menuRefresh");
    if (!btn) return;

    btn.addEventListener("click", refreshCurrent);
  }

  function bindBrand() {
    var btn = byId("menuBrandBtn");
    if (!btn) return;

    btn.addEventListener("click", function onBrandClick() {
      var item = getDefaultItem();
      if (item) {
        selectItem(item.id);
      }
    });
  }

  function bindRouter() {
    var Router = getRouter();
    if (!Router || typeof Router.init !== "function") {
      return;
    }

    Router.init(function onRouteChange(id) {
      selectItem(id, { syncHash: false });
    });
  }

  function loadInitial() {
    var Router = getRouter();
    var cfg = getConfig();
    var id = "";

    if (Router && typeof Router.getCurrentId === "function") {
      id = Router.getCurrentId();
    }

    if (!id && Router && typeof Router.getLastId === "function") {
      id = Router.getLastId();
    }

    if (!id) {
      id = cfg.defaultItemId;
    }

    selectItem(id, { replace: true });
  }

  function start() {
    bindNavClicks();
    bindRefresh();
    bindBrand();
    bindRouter();
    loadInitial();

    var frame = getFrame();
    var Render = getRender();

    if (frame && Render && typeof Render.setHint === "function") {
      frame.addEventListener("load", function onFrameLoad() {
        Render.setHint("Vista cargada correctamente.");
      });

      frame.addEventListener("error", function onFrameError() {
        Render.setHint("No se pudo cargar la vista seleccionada.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})(window, document);
