/*
=========================================================
Nombre del archivo: app.frame.js
Ruta o ubicación: /desarrollo/app/app.frame.js
Función o funciones:
- Controla la carga del módulo seleccionado dentro del iframe central
- Muestra estados de espera, carga y error de forma amigable
- Permite limpiar y recargar la vista sin tocar los módulos existentes
=========================================================
*/
(function attachAppFrame(window) {
  "use strict";

  window.DESARROLLO = window.DESARROLLO || {};

  function setStatus(element, text, kind) {
    if (!element) return;

    element.classList.remove("status-success", "status-warning", "status-danger");
    element.textContent = text || "";

    if (kind === "success") element.classList.add("status-success");
    if (kind === "warning") element.classList.add("status-warning");
    if (kind === "danger") element.classList.add("status-danger");
  }

  function showFrame(elements) {
    elements.emptyState.classList.add("is-hidden");
    elements.frame.classList.remove("is-hidden");
  }

  function showEmpty(elements) {
    elements.frame.classList.add("is-hidden");
    elements.emptyState.classList.remove("is-hidden");
  }

  function create(options) {
    var elements = options.elements;
    var envInfo = options.envInfo || { key: "unknown" };
    var currentModule = null;
    var currentSrc = "";

    function clear() {
      currentModule = null;
      currentSrc = "";
      elements.frame.removeAttribute("src");
      showEmpty(elements);
      setStatus(elements.frameStatus, "Esperando selección...", "warning");
    }

    function load(moduleItem) {
      if (!moduleItem || !moduleItem.path) {
        clear();
        return;
      }

      currentModule = moduleItem;
      currentSrc = buildFrameSrc(moduleItem.path);

      setStatus(elements.frameStatus, "Cargando módulo...", "warning");
      showFrame(elements);

      elements.frame.onload = function onFrameLoad() {
        setStatus(elements.frameStatus, "Módulo cargado correctamente.", "success");
      };

      elements.frame.onerror = function onFrameError() {
        setStatus(
          elements.frameStatus,
          "No se pudo cargar el módulo seleccionado.",
          "danger"
        );
      };

      elements.frame.src = currentSrc;
    }

    function reload() {
      if (!currentModule || !currentSrc) {
        clear();
        return;
      }

      setStatus(elements.frameStatus, "Recargando módulo...", "warning");

      try {
        if (elements.frame.contentWindow && elements.frame.contentWindow.location) {
          elements.frame.contentWindow.location.reload();
          return;
        }
      } catch (error) {
        elements.frame.src = currentSrc;
        return;
      }

      elements.frame.src = currentSrc;
    }

    function buildFrameSrc(path) {
      var cleanPath = String(path == null ? "" : path).trim();
      if (!cleanPath) return "";

      if (envInfo.key === "double-click") {
        return cleanPath;
      }

      return cleanPath;
    }

    return {
      clear: clear,
      load: load,
      reload: reload
    };
  }

  window.DESARROLLO.Frame = {
    create: create
  };
})(window);