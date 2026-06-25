/* =========================================================
Nombre completo: menu.boot.js
Ruta o ubicación: /Curriculo/menu/menu.boot.js
Función o funciones:
- Inicializar el menú Currículo
- Conectar configuración, router, render y frame principal
- Cargar pantalla Inicio o módulos dentro del iframe
- Permitir refrescar y abrir la vista actual en pestaña nueva
- Recordar la última pantalla usada
- Actualizar estado de guardado local
========================================================= */
(function bootCurriculoMenu(window, document) {
  "use strict";

  var currentItem = null;
  var statusTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function getConfig() {
    return window.CurriculoMenuConfig || {
      appTitle: "Currículo",
      defaultItemId: "inicio",
      items: []
    };
  }

  function getItems() {
    var cfg = getConfig();
    return Array.isArray(cfg.items) ? cfg.items.slice() : [];
  }

  function normalizeId(value) {
    if (window.CurriculoMenuRouter && typeof window.CurriculoMenuRouter.normalizeId === "function") {
      return window.CurriculoMenuRouter.normalizeId(value);
    }
    return String(value || "").trim().toLowerCase();
  }

  function getItemById(id) {
    var wanted = normalizeId(id);
    return getItems().find(function findItem(item) {
      return normalizeId(item.id) === wanted;
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

  function setHint(message, type) {
    var Render = getRender();
    if (Render && typeof Render.setHint === "function") {
      Render.setHint(message, type);
    }
  }

  function clearFrame(frame) {
    try {
      frame.removeAttribute("srcdoc");
    } catch (error) {
      return;
    }
  }

  function loadInternalHome(frame, item) {
    var Render = getRender();
    var html = "";

    if (Render && typeof Render.buildHomeHtml === "function") {
      html = Render.buildHomeHtml(getConfig());
    } else {
      html = "<!doctype html><html lang='es'><body><h1>Currículo</h1></body></html>";
    }

    frame.removeAttribute("src");
    frame.srcdoc = html;
    setHint(item.hint || "Pantalla inicial cargada.", "ok");
  }

  function loadFrameItem(frame, item) {
    var route = String(item.routeFromMenu || "").trim();

    if (!route) {
      setHint("La vista seleccionada no tiene ruta configurada.", "error");
      return;
    }

    clearFrame(frame);
    frame.src = route;
    setHint(item.hint || "Cargando módulo...", "normal");
  }

  function loadItem(item) {
    var frame = getFrame();

    if (!frame || !item) return;

    currentItem = item;

    if (item.disabled === true) {
      setHint("Este módulo todavía no está habilitado.", "error");
      return;
    }

    if (item.type === "internal" || String(item.routeFromMenu || "").indexOf("internal:") === 0) {
      loadInternalHome(frame, item);
      return;
    }

    loadFrameItem(frame, item);
  }

  function render(activeId) {
    var Render = getRender();
    if (!Render || typeof Render.renderNav !== "function") return;
    Render.renderNav(getItems(), activeId);
  }

  function selectItem(id, options) {
    var Router = getRouter();
    var item = getItemById(id) || getDefaultItem();

    if (!item) return;

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

    if (!frame || !currentItem) return;

    if (currentItem.type === "internal" || String(currentItem.routeFromMenu || "").indexOf("internal:") === 0) {
      loadInternalHome(frame, currentItem);
      setHint("Inicio refrescado.", "ok");
      return;
    }

    if (frame.src) {
      frame.src = frame.src;
      setHint("Vista actual refrescada.", "ok");
    }
  }

  function openCurrent() {
    if (!currentItem || currentItem.disabled === true) return;

    if (currentItem.type === "internal" || String(currentItem.routeFromMenu || "").indexOf("internal:") === 0) {
      setHint("La pantalla Inicio se abre dentro del menú.", "normal");
      return;
    }

    window.open(currentItem.routeFromMenu, "_blank", "noopener,noreferrer");
    setHint("Vista abierta en una pestaña nueva.", "ok");
  }

  function bindNavClicks() {
    var nav = byId("menuNav");
    if (!nav) return;

    nav.addEventListener("click", function onNavClick(event) {
      var button = event.target.closest("button[data-menu-id]");
      var id;
      if (!button || button.disabled) return;
      id = button.getAttribute("data-menu-id");
      selectItem(id);
    });
  }

  function bindRefresh() {
    var btn = byId("menuRefresh");
    if (!btn) return;
    btn.addEventListener("click", refreshCurrent);
  }

  function bindOpen() {
    var btn = byId("menuOpenCurrent");
    if (!btn) return;
    btn.addEventListener("click", openCurrent);
  }

  function bindBrand() {
    var btn = byId("menuBrandBtn");
    if (!btn) return;

    btn.addEventListener("click", function onBrandClick() {
      var item = getDefaultItem();
      if (item) selectItem(item.id);
    });
  }

  function bindRouter() {
    var Router = getRouter();
    if (!Router || typeof Router.init !== "function") return;

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

  function bindFrameEvents() {
    var frame = getFrame();
    if (!frame) return;

    frame.addEventListener("load", function onFrameLoad() {
      if (!currentItem) return;
      setHint((currentItem.title || "Vista") + " cargado correctamente.", "ok");
    });

    frame.addEventListener("error", function onFrameError() {
      setHint("No se pudo cargar la vista seleccionada.", "error");
    });
  }

  function startStatusRefresh() {
    function refreshStatus() {
      if (window.CurriculoSyncStatus && typeof window.CurriculoSyncStatus.refresh === "function") {
        window.CurriculoSyncStatus.refresh();
      }
    }

    refreshStatus();
    if (statusTimer) window.clearInterval(statusTimer);
    statusTimer = window.setInterval(refreshStatus, 5000);
  }

  function start() {
    bindNavClicks();
    bindRefresh();
    bindOpen();
    bindBrand();
    bindRouter();
    bindFrameEvents();
    loadInitial();
    startStatusRefresh();
  }

  document.addEventListener("DOMContentLoaded", start);
})(window, document);
