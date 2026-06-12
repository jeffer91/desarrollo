/*
=========================================================
Nombre completo: inc-menu.app.js
Ruta o ubicación: /incorporaciones/menu/inc-menu.app.js

Función o funciones:
1. Construir el menú superior inteligente de Incorporaciones.
2. Navegar entre pantallas internas sin salir de /incorporaciones/index.html.
3. Recordar la última pantalla abierta mediante inc-menu.memory.js.
4. Cargar las pantallas en un iframe central.
5. Mostrar errores reales si una pantalla no carga o si falla un script interno.
6. Ocultar títulos superiores duplicados dentro de las pantallas cargadas para
   mantener coherencia visual con el nuevo menú superior.

Con qué se une:
- /incorporaciones/index.html
- /incorporaciones/menu/inc-menu.routes.js
- /incorporaciones/menu/inc-menu.memory.js
- /incorporaciones/menu/inc-menu.styles.css
- Todas las pantallas registradas en inc-menu.routes.js
=========================================================
*/

(function attachIncMenuApp(window, document) {
  "use strict";

  var state = {
    currentRouteId: "",
    currentRoute: null,
    loadingToken: 0,
    loadingTimer: null,
    initialized: false
  };

  var elements = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function requireTools() {
    var missing = [];

    if (!window.IncMenuRoutes) {
      missing.push("IncMenuRoutes");
    }

    if (!window.IncMenuMemory) {
      missing.push("IncMenuMemory");
    }

    if (missing.length > 0) {
      throw new Error("Faltan archivos del menú: " + missing.join(", "));
    }
  }

  function collectElements() {
    elements = {
      nav: $("incNav"),
      frame: $("incModuleFrame"),
      loader: $("incLoader"),
      loaderText: $("incLoaderText"),
      errorBox: $("incErrorBox"),
      errorMessage: $("incErrorMessage"),
      errorDetail: $("incErrorDetail"),
      retryBtn: $("incRetryBtn"),
      goDefaultBtn: $("incGoDefaultBtn"),
      reloadBtn: $("incReloadBtn"),
      currentLabel: $("incCurrentLabel"),
      currentPath: $("incCurrentPath"),
      statusbar: $("incStatusbar")
    };

    var required = [
      "nav",
      "frame",
      "loader",
      "loaderText",
      "errorBox",
      "errorMessage",
      "errorDetail",
      "retryBtn",
      "goDefaultBtn",
      "reloadBtn",
      "currentLabel",
      "currentPath"
    ];

    required.forEach(function checkElement(key) {
      if (!elements[key]) {
        throw new Error("No existe el elemento requerido: " + key);
      }
    });
  }

  function buildRouteButton(route, extraClass) {
    var label = route.shortLabel || route.label;
    var classes = "inc-nav-btn " + (extraClass || "");

    return [
      '<button type="button"',
      ' class="' + classes + '"',
      ' data-inc-route="' + escapeHtml(route.id) + '"',
      ' title="' + escapeHtml(route.description || route.label) + '">',
      '<span>' + escapeHtml(label) + "</span>",
      "</button>"
    ].join("");
  }

  function buildGroup(item) {
    var children = item.children || [];

    return [
      '<div class="inc-nav-group" data-inc-group="' + escapeHtml(item.id) + '">',
      '<button type="button" class="inc-nav-btn inc-nav-group-btn" data-inc-group-toggle="' + escapeHtml(item.id) + '">',
      '<span>' + escapeHtml(item.shortLabel || item.label) + "</span>",
      '<span class="inc-chevron">▾</span>',
      "</button>",
      '<div class="inc-submenu" data-inc-submenu="' + escapeHtml(item.id) + '">',
      children.map(function mapChild(child) {
        return [
          '<button type="button"',
          ' class="inc-submenu-btn"',
          ' data-inc-route="' + escapeHtml(child.id) + '"',
          ' title="' + escapeHtml(child.description || child.label) + '">',
          '<span>' + escapeHtml(child.label) + "</span>",
          "</button>"
        ].join("");
      }).join(""),
      "</div>",
      "</div>"
    ].join("");
  }

  function renderMenu() {
    var menuItems = window.IncMenuRoutes.getMenuItems();

    elements.nav.innerHTML = menuItems.map(function mapItem(item) {
      if (item.type === "group") {
        return buildGroup(item);
      }

      return buildRouteButton(item, "");
    }).join("");
  }

  function closeAllSubmenus() {
    var groups = document.querySelectorAll(".inc-nav-group.is-open");
    groups.forEach(function closeGroup(group) {
      group.classList.remove("is-open");
    });
  }

  function toggleSubmenu(groupId) {
    var group = document.querySelector('[data-inc-group="' + groupId + '"]');

    if (!group) {
      return;
    }

    var isOpen = group.classList.contains("is-open");

    closeAllSubmenus();

    if (!isOpen) {
      group.classList.add("is-open");
    }
  }

  function clearActiveMenu() {
    var activeItems = document.querySelectorAll(".inc-nav-btn.is-active, .inc-submenu-btn.is-active, .inc-nav-group.is-active");

    activeItems.forEach(function removeActive(item) {
      item.classList.remove("is-active");
    });
  }

  function markActiveMenu(route) {
    clearActiveMenu();

    var routeButton = document.querySelector('[data-inc-route="' + route.id + '"]');

    if (routeButton) {
      routeButton.classList.add("is-active");
    }

    if (route.parentId) {
      var parentGroup = document.querySelector('[data-inc-group="' + route.parentId + '"]');
      var parentToggle = document.querySelector('[data-inc-group-toggle="' + route.parentId + '"]');

      if (parentGroup) {
        parentGroup.classList.add("is-active");
      }

      if (parentToggle) {
        parentToggle.classList.add("is-active");
      }
    }
  }

  function setStatus(route) {
    var label = route.parentLabel
      ? route.parentLabel + " / " + route.label
      : route.label;

    elements.currentLabel.textContent = label;
    elements.currentPath.textContent = route.path || "";
  }

  function showLoader(message) {
    elements.loaderText.textContent = message || "Cargando pantalla...";
    elements.loader.classList.remove("is-hidden");
  }

  function hideLoader() {
    elements.loader.classList.add("is-hidden");
  }

  function hideError() {
    elements.errorBox.classList.add("is-hidden");
    elements.errorMessage.textContent = "";
    elements.errorDetail.textContent = "";
  }

  function showError(message, detail) {
    hideLoader();

    elements.errorMessage.textContent = message || "Se produjo un error inesperado.";
    elements.errorDetail.textContent = detail || "";
    elements.errorBox.classList.remove("is-hidden");
  }

  function getHashRouteId() {
    var raw = String(window.location.hash || "").replace(/^#/, "").trim();

    if (!raw) {
      return "";
    }

    try {
      raw = decodeURIComponent(raw);
    } catch (error) {
      return "";
    }

    return raw;
  }

  function setHashRouteId(routeId) {
    var newHash = "#" + encodeURIComponent(routeId);

    if (window.location.hash === newHash) {
      return;
    }

    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", newHash);
    } else {
      window.location.hash = newHash;
    }
  }

  function getInitialRouteId() {
    var hashRouteId = getHashRouteId();
    var validIds = window.IncMenuRoutes.getRouteIds();
    var defaultRouteId = window.IncMenuRoutes.getDefaultRouteId();

    if (hashRouteId && window.IncMenuRoutes.isValidRoute(hashRouteId)) {
      return hashRouteId;
    }

    return window.IncMenuMemory.getLastRouteId(validIds, defaultRouteId);
  }

  function clearLoadingTimer() {
    if (state.loadingTimer) {
      window.clearTimeout(state.loadingTimer);
      state.loadingTimer = null;
    }
  }

  function buildErrorDetail(route, errorText) {
    return [
      "Pantalla: " + (route ? route.label : "No identificada"),
      "Ruta: " + (route ? route.path : "No identificada"),
      "Detalle: " + (errorText || "No se recibió detalle técnico.")
    ].join("\n");
  }

  function isFrameDocumentEmpty(frameDocument) {
    if (!frameDocument || !frameDocument.body) {
      return false;
    }

    var text = String(frameDocument.body.innerText || "").trim();
    var html = String(frameDocument.body.innerHTML || "").trim();

    return !text && !html;
  }

  function injectCleanupStyles(frameDocument, route) {
    if (!frameDocument || !frameDocument.head) {
      return;
    }

    if (frameDocument.getElementById("inc-menu-shell-cleanup")) {
      return;
    }

    var style = frameDocument.createElement("style");
    style.id = "inc-menu-shell-cleanup";
    style.textContent = [
      "html, body {",
      "  background: #f6f8fb !important;",
      "}",
      "body {",
      "  margin-top: 0 !important;",
      "}",
      "body > h1:first-child,",
      "body > header:first-child h1:first-child,",
      "body > main:first-child > h1:first-child,",
      "body > section:first-child > h1:first-child,",
      ".page-title,",
      ".screen-title,",
      ".module-title,",
      ".main-title,",
      ".app-title,",
      ".hero-title,",
      ".index-title,",
      ".titulo-principal,",
      ".encabezado-principal {",
      "  display: none !important;",
      "}",
      ".shell-title,",
      ".layout-title {",
      "  display: none !important;",
      "}"
    ].join("\n");

    frameDocument.head.appendChild(style);

    if (route && frameDocument.title) {
      frameDocument.title = route.label + " | Incorporaciones";
    }
  }

  function attachFrameErrorListeners(frameWindow, route) {
    if (!frameWindow || frameWindow.__incShellErrorBridgeAttached) {
      return;
    }

    frameWindow.__incShellErrorBridgeAttached = true;

    frameWindow.addEventListener("error", function onChildError(event) {
      var detail = [
        "Pantalla: " + route.label,
        "Ruta: " + route.path,
        "Mensaje: " + (event.message || "Error de JavaScript."),
        "Archivo: " + (event.filename || "No identificado"),
        "Línea: " + (event.lineno || "No identificada"),
        "Columna: " + (event.colno || "No identificada")
      ].join("\n");

      showError(
        "La pantalla abrió, pero uno de sus scripts produjo un error.",
        detail
      );
    });

    frameWindow.addEventListener("unhandledrejection", function onChildPromiseError(event) {
      var reason = event.reason;
      var message = "";

      if (reason && reason.message) {
        message = reason.message;
      } else {
        message = String(reason || "Promesa rechazada sin detalle.");
      }

      var detail = [
        "Pantalla: " + route.label,
        "Ruta: " + route.path,
        "Mensaje: " + message
      ].join("\n");

      showError(
        "La pantalla abrió, pero ocurrió un error interno asíncrono.",
        detail
      );
    });
  }

  function adaptLoadedFrame(route) {
    try {
      var frameDocument = elements.frame.contentDocument;
      var frameWindow = elements.frame.contentWindow;

      if (!frameDocument) {
        return;
      }

      injectCleanupStyles(frameDocument, route);
      attachFrameErrorListeners(frameWindow, route);

      if (isFrameDocumentEmpty(frameDocument)) {
        showError(
          "La pantalla cargó sin contenido visible.",
          buildErrorDetail(route, "El documento interno está vacío.")
        );
      }
    } catch (error) {
      showError(
        "No se pudo revisar la pantalla cargada.",
        buildErrorDetail(route, error.message)
      );
    }
  }

  function loadRoute(routeId, options) {
    var route = window.IncMenuRoutes.findRouteById(routeId);
    var token;

    options = options || {};

    if (!route) {
      route = window.IncMenuRoutes.getDefaultRoute();
    }

    if (!route) {
      showError(
        "No existe una ruta inicial válida.",
        "Revisa inc-menu.routes.js."
      );
      return;
    }

    clearLoadingTimer();
    hideError();
    closeAllSubmenus();

    state.currentRouteId = route.id;
    state.currentRoute = route;
    state.loadingToken += 1;
    token = state.loadingToken;

    markActiveMenu(route);
    setStatus(route);
    showLoader("Cargando " + route.label + "...");

    if (!options.skipMemory) {
      window.IncMenuMemory.saveRoute(route.id, route);
    }

    if (!options.skipHash) {
      setHashRouteId(route.id);
    }

    state.loadingTimer = window.setTimeout(function onLoadTimeout() {
      if (token !== state.loadingToken) {
        return;
      }

      showError(
        "La pantalla tardó demasiado en cargar.",
        buildErrorDetail(route, "Tiempo de espera agotado.")
      );
    }, 10000);

    elements.frame.onload = function onFrameLoad() {
      if (token !== state.loadingToken) {
        return;
      }

      clearLoadingTimer();
      hideLoader();
      adaptLoadedFrame(route);
    };

    elements.frame.onerror = function onFrameError() {
      if (token !== state.loadingToken) {
        return;
      }

      clearLoadingTimer();
      showError(
        "No se pudo abrir el archivo de esta pantalla.",
        buildErrorDetail(route, "Error de carga del iframe.")
      );
    };

    elements.frame.src = route.path;
  }

  function reloadCurrentRoute() {
    if (!state.currentRouteId) {
      loadRoute(window.IncMenuRoutes.getDefaultRouteId());
      return;
    }

    loadRoute(state.currentRouteId, {
      skipMemory: false,
      skipHash: false
    });
  }

  function bindEvents() {
    elements.nav.addEventListener("click", function onNavClick(event) {
      var routeButton = event.target.closest("[data-inc-route]");
      var groupToggle = event.target.closest("[data-inc-group-toggle]");

      if (routeButton) {
        loadRoute(routeButton.getAttribute("data-inc-route"));
        return;
      }

      if (groupToggle) {
        toggleSubmenu(groupToggle.getAttribute("data-inc-group-toggle"));
      }
    });

    document.addEventListener("click", function onDocumentClick(event) {
      if (!event.target.closest(".inc-nav-group")) {
        closeAllSubmenus();
      }
    });

    document.addEventListener("keydown", function onKeyDown(event) {
      if (event.key === "Escape") {
        closeAllSubmenus();
      }
    });

    elements.retryBtn.addEventListener("click", function onRetryClick() {
      reloadCurrentRoute();
    });

    elements.reloadBtn.addEventListener("click", function onReloadClick() {
      reloadCurrentRoute();
    });

    elements.goDefaultBtn.addEventListener("click", function onGoDefaultClick() {
      loadRoute(window.IncMenuRoutes.getDefaultRouteId());
    });

    window.addEventListener("hashchange", function onHashChange() {
      var routeId = getHashRouteId();

      if (!routeId || routeId === state.currentRouteId) {
        return;
      }

      if (window.IncMenuRoutes.isValidRoute(routeId)) {
        loadRoute(routeId, {
          skipHash: true
        });
      }
    });
  }

  function boot() {
    try {
      requireTools();
      collectElements();
      renderMenu();
      bindEvents();

      state.initialized = true;

      loadRoute(getInitialRouteId());
    } catch (error) {
      collectElements();
      showError(
        "No se pudo iniciar el menú de Incorporaciones.",
        error && error.stack ? error.stack : String(error)
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.IncMenuApp = {
    loadRoute: loadRoute,
    reloadCurrentRoute: reloadCurrentRoute,
    getState: function getState() {
      return Object.assign({}, state);
    }
  };
})(window, document);