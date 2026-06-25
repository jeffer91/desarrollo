/*
Nombre del archivo: ccc.extra-ui.js
Ubicación: /Curriculo/pea_documentos/ccc.extra-ui.js
Función:
- Agregar estado de sincronización PEA si no existe
- Refrescar contador de pendientes locales
- Mejorar mensajes visuales sin tocar la lógica principal
*/
(function (window, document) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  function ensureSyncStatus() {
    var status = document.getElementById("peaStatus");
    var existing = document.getElementById("peaSyncStatus");
    var node;

    if (!status || existing) return;

    node = document.createElement("div");
    node.id = "peaSyncStatus";
    node.className = "pea-sync-status";
    node.setAttribute("aria-live", "polite");
    node.textContent = "Preparando sincronización PEA...";
    status.parentNode.insertBefore(node, status.nextSibling);
  }

  function refresh() {
    var node = document.getElementById("peaSyncStatus");
    var pending = 0;

    if (!node) return;

    if (PEA.store && typeof PEA.store.countPendingLocal === "function") {
      pending = PEA.store.countPendingLocal();
    }

    node.textContent = pending ? "Pendientes PEA por subir: " + pending : "PEA local sin pendientes.";
    node.setAttribute("data-pending", String(pending));
  }

  function boot() {
    ensureSyncStatus();
    refresh();
    window.setInterval(refresh, 5000);
  }

  PEA.extraUi = { refresh: refresh, ensureSyncStatus: ensureSyncStatus };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
