/*
Nombre del archivo: mat.local-patch.js
Ubicación: /Curriculo/materias/frontend/core/mat.local-patch.js
Función:
- Conectar la vista Materias con CurriculoLocal cuando se abre dentro del menú
- Refrescar estado visual de sincronización
- Exponer helpers seguros para sincronización manual
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  function fromParent(name) {
    try {
      if (window.parent && window.parent !== window && window.parent[name]) {
        return window.parent[name];
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  MAT.localPatch = {
    getLocal: function () {
      return window.CurriculoLocal || fromParent("CurriculoLocal") || null;
    },

    getSync: function () {
      return window.CurriculoSync || fromParent("CurriculoSync") || null;
    },

    getStatus: function () {
      return window.CurriculoSyncStatus || fromParent("CurriculoSyncStatus") || null;
    },

    refreshStatus: async function () {
      var status = this.getStatus();
      if (status && typeof status.refresh === "function") {
        return await status.refresh();
      }
      return null;
    },

    syncNow: async function () {
      var sync = this.getSync();
      if (sync && typeof sync.syncNow === "function") {
        return await sync.syncNow({ force: true });
      }
      return { ok: false, mensaje: "Sincronización no disponible." };
    }
  };
})(window);
