/* =========================================================
Nombre completo: menu.js
Ruta o ubicación: /audit/menu/menu.js
Función o funciones:
- Renderizar el menú superior de Audit desde un catálogo de rutas.
- Mantener visibles SCAN y BL aunque sus carpetas no estén instaladas.
- Comprobar módulos mediante manifiestos locales sin reutilizar datos obsoletos.
- Validar identidad, disponibilidad y entrada de cada módulo.
- Marcar un módulo como abierto solo después de cargar su iframe.
- Sincronizar la navegación con location.hash.
- Funcionar con file://, servidor local y Electron.
========================================================= */

(function bootAuditMenu(window, document) {
  "use strict";

  var DEFAULT_ROUTES = [
    {
      id: "scan",
      label: "SCAN",
      badge: "01",
      title: "Escaneo de archivos comprimidos",
      description: "Carga, analiza y documenta la estructura completa de archivos ZIP.",
      href: "../scan/scan.index.html",
      probe: "../scan/scan.manifest.js",
      default: true
    },
    {
      id: "bl",
      label: "BL",
      badge: "02",
      title: "Base local",
      description: "Almacena, consulta y conecta la información procesada por los módulos de Audit.",
      href: "../bl/bl.index.html",
      probe: "../bl/bl.manifest.js"
    }
  ];

  var state = {
    routes: [],
    activeId: "",
    availability: Object.create(null),
    loadToken: 0
  };

  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeId(value) {
    return text(value).toLowerCase();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cloneRoutes(source) {
    var list = Array.isArray(source) && source.length ? source : DEFAULT_ROUTES;
    var used = new Set();

    return list
      .map(function normalizeRoute(route, index) {
        var id = normalizeId(route && route.id);
        if (!id || used.has(id)) return null;
        used.add(id);

        return {
          id: id,
          label: text(route.label) || id.toUpperCase(),
          badge: text(route.badge),
          title: text(route.title) || text(route.label) || id.toUpperCase(),
          description: text(route.description),
          href: text(route.href),
          probe: text(route.probe),
          default: Boolean(route.default) || index === 0
        };
      })
      .filter(Boolean);
  }

  function getRouteById(id) {
    var wanted = normalizeId(id);
    return state.routes.find(function findRoute(route) {
      return route.id === wanted;
    }) || null;
  }

  function getDefaultRoute() {
    return state.routes.find(function findDefault(route) {
      return route.default;
    }) || state.routes[0] || null;
  }

  function readHashId() {
    return normalizeId((window.location.hash || "").replace(/^#/, ""));
  }

  function writeHashId(id) {
    var normalized = normalizeId(id);
    if (!normalized) return;

    var next = "#" + normalized;
    if (window.location.hash === next) {
      openRoute(normalized);
      return;
    }

    window.location.hash = next;
  }

  function setStatus(mode, message) {
    var dot = $("auditStatusDot");
    var label = $("auditStatusText");

    if (dot) {
      dot.className = "audit-status-dot " + (
        mode === "loading" ? "is-loading" :
        mode === "ready" ? "is-ready" :
        mode === "error" ? "is-error" :
        "is-idle"
      );
    }

    if (label) label.textContent = text(message) || "Audit listo.";
  }

  function setActiveNavigation(id) {
    var wanted = normalizeId(id);
    var buttons = document.querySelectorAll(".audit-nav-button[data-route-id]");

    buttons.forEach(function updateButton(button) {
      var isActive = normalizeId(button.getAttribute("data-route-id")) === wanted;
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function renderNavigation() {
    var host = $("auditMenuNav");
    if (!host) return;

    host.innerHTML = state.routes.map(function routeButton(route) {
      var badge = route.badge
        ? '<span class="audit-nav-button__badge">' + escapeHtml(route.badge) + "</span>"
        : "";

      return (
        '<a class="audit-nav-button" href="#' + escapeHtml(route.id) + '" ' +
        'data-route-id="' + escapeHtml(route.id) + '">' +
        '<span>' + escapeHtml(route.label) + "</span>" +
        badge +
        "</a>"
      );
    }).join("");

    host.addEventListener("click", function onNavigationClick(event) {
      var link = event.target && event.target.closest
        ? event.target.closest(".audit-nav-button[data-route-id]")
        : null;

      if (!link) return;
      event.preventDefault();
      writeHashId(link.getAttribute("data-route-id"));
    });
  }

  function showUnavailable(route, reason) {
    var empty = $("auditEmptyState");
    var frame = $("auditModuleFrame");
    var title = $("auditEmptyTitle");
    var description = $("auditEmptyDescription");
    var path = $("auditEmptyPath");

    if (frame) {
      frame.hidden = true;
      frame.removeAttribute("src");
      frame.removeAttribute("data-route-id");
      frame.setAttribute("aria-busy", "false");
    }

    if (title) title.textContent = route.label + " no está disponible";
    if (description) {
      description.textContent = text(reason) ||
        "La opción permanece visible, pero su carpeta independiente todavía no está instalada.";
    }
    if (path) path.textContent = route.href || "Sin ruta configurada";
    if (empty) empty.hidden = false;

    setStatus("error", route.label + " está registrado, pero no se encontró su módulo independiente.");
  }

  function showFrame(route) {
    var empty = $("auditEmptyState");
    var frame = $("auditModuleFrame");

    if (empty) empty.hidden = true;
    if (!frame) return;

    frame.hidden = false;
    frame.title = route.title;
    frame.setAttribute("data-route-id", route.id);
    frame.setAttribute("aria-busy", "true");
    setStatus("loading", "Abriendo " + route.label + "...");
    frame.src = route.href;
  }

  function buildProbeUrl(route) {
    if (!route.probe) return "";

    try {
      var url = new URL(route.probe, window.location.href);
      url.searchParams.set("audit_probe", String(Date.now()));
      return url.href;
    } catch (_error) {
      var separator = route.probe.indexOf("?") >= 0 ? "&" : "?";
      return route.probe + separator + "audit_probe=" + Date.now();
    }
  }

  function validateManifest(route, manifest) {
    if (!manifest || typeof manifest !== "object") {
      return "El archivo de manifiesto no registró el módulo esperado.";
    }

    if (normalizeId(manifest.id) !== route.id) {
      return "El manifiesto pertenece a un módulo diferente.";
    }

    if (manifest.available === false) {
      return "El manifiesto indicó que el módulo no está disponible.";
    }

    if (!text(manifest.entry)) {
      return "El manifiesto no declaró una pantalla de entrada.";
    }

    if (manifest.standalone === false) {
      return "El módulo no confirmó que puede funcionar independientemente.";
    }

    return "";
  }

  function probeModule(route, force) {
    return new Promise(function resolveProbe(resolve) {
      if (!route || !route.href) {
        resolve({ available: false, reason: "El módulo no tiene una ruta de entrada configurada." });
        return;
      }

      if (!force && state.availability[route.id]) {
        resolve(state.availability[route.id]);
        return;
      }

      if (!route.probe) {
        var noProbe = {
          available: false,
          reason: "El módulo no tiene un manifiesto de disponibilidad configurado."
        };
        state.availability[route.id] = noProbe;
        resolve(noProbe);
        return;
      }

      window.AUDIT_MODULES = window.AUDIT_MODULES || {};
      delete window.AUDIT_MODULES[route.id];

      var script = document.createElement("script");
      var finished = false;
      var timeoutId = window.setTimeout(function onProbeTimeout() {
        finish(false, "La comprobación del módulo superó el tiempo permitido.");
      }, 5000);

      function cleanup() {
        window.clearTimeout(timeoutId);
        script.onload = null;
        script.onerror = null;
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      function finish(available, reason) {
        if (finished) return;
        finished = true;
        cleanup();

        var result = {
          available: Boolean(available),
          reason: text(reason)
        };

        state.availability[route.id] = result;
        resolve(result);
      }

      script.async = true;
      script.src = buildProbeUrl(route);

      script.onload = function onProbeLoaded() {
        var manifest = window.AUDIT_MODULES && window.AUDIT_MODULES[route.id];
        var validationError = validateManifest(route, manifest);

        if (validationError) {
          finish(false, validationError);
          return;
        }

        finish(true, "");
      };

      script.onerror = function onProbeError() {
        finish(false, "No se encontró la carpeta o el manifiesto independiente de este módulo.");
      };

      document.head.appendChild(script);
    });
  }

  async function openRoute(id, options) {
    var route = getRouteById(id) || getDefaultRoute();
    if (!route) {
      setStatus("error", "No hay módulos configurados en Audit.");
      return;
    }

    options = options || {};
    state.activeId = route.id;
    state.loadToken += 1;
    var token = state.loadToken;

    setActiveNavigation(route.id);
    setStatus("loading", "Comprobando " + route.label + "...");

    var result = await probeModule(route, Boolean(options.force));
    if (token !== state.loadToken) return;

    if (result.available) showFrame(route);
    else showUnavailable(route, result.reason);
  }

  function refreshActiveRoute() {
    var route = getRouteById(state.activeId) || getDefaultRoute();
    if (!route) return;

    delete state.availability[route.id];
    openRoute(route.id, { force: true });
  }

  function bindActions() {
    var refreshButton = $("auditRefreshButton");
    var retryButton = $("auditRetryButton");
    var frame = $("auditModuleFrame");

    if (refreshButton) {
      refreshButton.addEventListener("click", refreshActiveRoute);
    }

    if (retryButton) {
      retryButton.addEventListener("click", refreshActiveRoute);
    }

    if (frame) {
      frame.addEventListener("load", function onModuleLoaded() {
        var routeId = normalizeId(frame.getAttribute("data-route-id"));
        if (!routeId || routeId !== state.activeId) return;

        frame.setAttribute("aria-busy", "false");
        var route = getRouteById(routeId);
        setStatus("ready", "Abierto: " + (route ? route.label : routeId.toUpperCase()) + ".");
      });

      frame.addEventListener("error", function onModuleError() {
        var route = getRouteById(frame.getAttribute("data-route-id")) || getDefaultRoute();
        if (route) showUnavailable(route, "La pantalla del módulo no pudo cargarse.");
      });
    }

    window.addEventListener("hashchange", function onHashChange() {
      openRoute(readHashId());
    });
  }

  function boot() {
    state.routes = cloneRoutes(window.AUDIT_MENU_ROUTES);
    renderNavigation();
    bindActions();

    var requestedId = readHashId();
    var initial = getRouteById(requestedId) || getDefaultRoute();
    if (!initial) {
      setStatus("error", "No hay rutas configuradas.");
      return;
    }

    if (requestedId !== initial.id) {
      window.location.hash = "#" + initial.id;
      return;
    }

    openRoute(initial.id);
  }

  window.AuditMenu = {
    getRoutes: function getRoutes() {
      return state.routes.map(function copyRoute(route) {
        return Object.assign({}, route);
      });
    },
    open: writeHashId,
    refresh: refreshActiveRoute,
    getActiveId: function getActiveId() {
      return state.activeId;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window, document);
