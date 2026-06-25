/* Curriculo sync status: texto compacto de guardado local y subida */
(function (window, document) {
  "use strict";

  var lastSyncEvent = null;

  function safeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function formatDate(value) {
    if (!value) return "";
    return String(value).slice(0, 16).replace("T", " ");
  }

  function textForStatus(status) {
    var pending;

    if (lastSyncEvent && lastSyncEvent.running) {
      return lastSyncEvent.message || "Subiendo cambios pendientes a Firebase...";
    }

    if (lastSyncEvent && lastSyncEvent.error) {
      return "Local guardado · error al subir: " + safeText(lastSyncEvent.error);
    }

    if (!status) {
      return "Guardado local listo.";
    }

    pending = Number(status.pending || 0);

    if (pending > 0) {
      return "Local guardado · pendientes por subir: " + pending;
    }

    if (status.lastDailySyncAt) {
      return "Local guardado · sincronizado: " + formatDate(status.lastDailySyncAt);
    }

    return "Local guardado · sin cambios pendientes.";
  }

  function updateDom(status) {
    var nodes = document.querySelectorAll("[data-curriculo-sync-status]");
    var text = textForStatus(status);
    var pending = status ? Number(status.pending || 0) : 0;
    var i;

    for (i = 0; i < nodes.length; i += 1) {
      nodes[i].textContent = text;
      nodes[i].setAttribute("data-curriculo-sync-pending", String(pending));
    }
  }

  async function refresh() {
    if (!window.CurriculoLocal || typeof window.CurriculoLocal.status !== "function") {
      updateDom(null);
      return null;
    }

    try {
      var status = await window.CurriculoLocal.status();
      updateDom(status);
      return status;
    } catch (error) {
      updateDom(null);
      return null;
    }
  }

  window.addEventListener("curriculo-local-status", function (event) {
    if (!lastSyncEvent || !lastSyncEvent.running) {
      updateDom(event.detail || null);
    }
  });

  window.addEventListener("curriculo-sync-status", function (event) {
    lastSyncEvent = event.detail || null;
    updateDom(null);

    if (!lastSyncEvent || !lastSyncEvent.running) {
      window.setTimeout(function () {
        lastSyncEvent = null;
        refresh();
      }, 1200);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  window.CurriculoSyncStatus = {
    refresh: refresh,
    updateDom: updateDom
  };
})(window, document);
