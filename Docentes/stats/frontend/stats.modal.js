/*
Nombre del archivo: stats.modal.js
Ruta: stats/frontend/stats.modal.js
Función:
- Modal reutilizable para todo el módulo stats
- Abre detalles de capacitaciones, carreras, sexo, periodos, participantes e inconsistencias
- Centraliza overlay, cierre y contenido dinámico
- Hidrata el root aunque ya exista vacío en el HTML
*/
(function attachStatsModal(window, document) {
  "use strict";

  window.STATS = window.STATS || {};

  var ROOT_ID = "statsModalRoot";
  var isBound = false;

  function escapeHtml(value) {
    if (window.STATS.UI && typeof window.STATS.UI.escapeHtml === "function") {
      return window.STATS.UI.escapeHtml(value);
    }

    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  function getBaseMarkup() {
    return [
      '<div class="stats-modal-backdrop" data-stats-modal-close="backdrop"></div>',
      '<div class="stats-modal stats-modal-md" role="dialog" aria-modal="true" aria-labelledby="statsModalTitle">',
      '<div class="stats-modal-header">',
      '<div class="stats-modal-head-copy">',
      '<div class="stats-modal-kicker">Detalle</div>',
      '<h2 id="statsModalTitle" class="stats-modal-title">Detalle</h2>',
      '<p id="statsModalSubtitle" class="stats-modal-subtitle"></p>',
      "</div>",
      '<button type="button" class="stats-modal-close" aria-label="Cerrar" data-stats-modal-close="button">×</button>',
      "</div>",
      '<div id="statsModalBody" class="stats-modal-body"></div>',
      "</div>"
    ].join("");
  }

  function ensureRoot() {
    var root = getRoot();

    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      root.className = "stats-modal-root";
      root.setAttribute("aria-hidden", "true");
      document.body.appendChild(root);
    }

    if (!root.innerHTML || !root.querySelector(".stats-modal")) {
      root.innerHTML = getBaseMarkup();
    }

    bindGlobalEvents();
    return root;
  }

  function getNodes() {
    var root = ensureRoot();

    return {
      root: root,
      dialog: root.querySelector(".stats-modal"),
      title: root.querySelector("#statsModalTitle"),
      subtitle: root.querySelector("#statsModalSubtitle"),
      body: root.querySelector("#statsModalBody")
    };
  }

  function applySize(dialog, size) {
    var width;

    if (!dialog) return;

    if (size === "sm") width = "min(680px, calc(100vw - 28px))";
    else if (size === "lg") width = "min(1180px, calc(100vw - 28px))";
    else if (size === "xl") width = "min(1320px, calc(100vw - 28px))";
    else width = "min(860px, calc(100vw - 28px))";

    dialog.style.width = width;
  }

  function close() {
    var nodes = getNodes();

    nodes.root.classList.remove("is-open");
    nodes.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("stats-modal-open");
  }

  function open(options) {
    var nodes = getNodes();
    var settings = options && typeof options === "object" ? options : {};

    nodes.title.textContent = settings.title || "Detalle";
    nodes.subtitle.textContent = settings.subtitle || "";
    nodes.body.innerHTML = settings.contentHtml || "";
    applySize(nodes.dialog, settings.size || "md");

    nodes.root.classList.add("is-open");
    nodes.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("stats-modal-open");
  }

  function buildInfoList(items) {
    var safeItems = Array.isArray(items) ? items : [];

    if (!safeItems.length) {
      return '<div class="stats-empty">Sin información para mostrar.</div>';
    }

    return [
      '<div class="stats-modal-info-grid">',
      safeItems.map(function eachItem(item) {
        return [
          '<div class="stats-modal-info-card">',
          '<div class="stats-modal-info-label">', escapeHtml(item[0] || "Campo"), "</div>",
          '<div class="stats-modal-info-value">', escapeHtml(item[1] == null ? "—" : item[1]), "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function bindGlobalEvents() {
    if (isBound) return;
    isBound = true;

    document.addEventListener("click", function onDocumentClick(event) {
      var target = event.target;

      if (!target || !target.closest) return;

      if (target.closest("[data-stats-modal-close='backdrop']") || target.closest("[data-stats-modal-close='button']")) {
        close();
      }
    });

    document.addEventListener("keydown", function onDocumentKeyDown(event) {
      if (event.key === "Escape") {
        close();
      }
    });
  }

  window.STATS.Modal = {
    ensureRoot: ensureRoot,
    open: open,
    close: close,
    buildInfoList: buildInfoList
  };
})(window, document);