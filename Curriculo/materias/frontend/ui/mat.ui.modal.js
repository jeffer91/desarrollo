/*
Nombre del archivo: mat.ui.modal.js
Ubicación: /Curriculo/materias/frontend/ui/mat.ui.modal.js
Función:
- Manejar apertura y cierre del modal
- Manejar status visual del modal
- Habilitar o deshabilitar Aplicar al editor
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.ui = MAT.ui || {};
  MAT.ui.modal = MAT.ui.modal || {};

  MAT.ui.modal.getRoot = function () { return MAT.ui.getEl("modal"); };
  MAT.ui.modal.getPanel = function () { return MAT.ui.getEl("modalPanel"); };
  MAT.ui.modal.getCloseButton = function () { return MAT.ui.getEl("modalClose"); };
  MAT.ui.modal.getApplyButton = function () { return MAT.ui.getEl("applyMassiveButton"); };
  MAT.ui.modal.getInput = function () { return MAT.ui.getEl("massiveInput"); };
  MAT.ui.modal.getStatusEl = function () { return MAT.ui.getEl("modalStatus"); };

  MAT.ui.modal.isOpen = function () {
    var root = this.getRoot();
    return !!(root && root.classList.contains("is-open"));
  };

  MAT.ui.modal.open = function () {
    var root = this.getRoot();
    if (!root) return;
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  MAT.ui.modal.close = function () {
    var root = this.getRoot();
    if (!root) return;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  MAT.ui.modal.focusInput = function () {
    var input = this.getInput();
    if (!input) return;
    window.setTimeout(function () { input.focus(); }, 30);
  };

  MAT.ui.modal.setStatus = function (message, type) {
    var el = this.getStatusEl();
    if (!el) return;
    el.className = "mat-status";
    if (type) el.classList.add(type);
    el.textContent = String(message || "");
  };

  MAT.ui.modal.setApplyEnabled = function (enabled) {
    var btn = this.getApplyButton();
    if (btn) btn.disabled = !enabled;
  };

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && MAT.ui.modal.isOpen()) MAT.ui.modal.close();
  });

  document.addEventListener("click", function (event) {
    var root = MAT.ui.modal.getRoot();
    if (root && event.target === root) MAT.ui.modal.close();
  });
})(window, document);
