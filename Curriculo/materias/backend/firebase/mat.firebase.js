/*
Nombre del archivo: mat.firebase.js
Ubicación: /Curriculo/materias/backend/firebase/mat.firebase.js
Función:
- Inicializar Firebase sin duplicar la app
- Exponer Firestore para materias
- Conectar Materias con la base local central de Currículo cuando exista
- Dejar los cambios pendientes para sincronización diaria
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function collectionName() {
    return clean(MAT.config && MAT.config.collectionName) || "carreras";
  }

  function getLocalDb() {
    if (window.CurriculoLocal) {
      return window.CurriculoLocal;
    }

    try {
      if (window.parent && window.parent !== window && window.parent.CurriculoLocal) {
        return window.parent.CurriculoLocal;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function localDisponible() {
    var local = getLocalDb();

    return !!(
      local &&
      typeof local.get === "function" &&
      typeof local.put === "function" &&
      typeof local.all === "function"
    );
  }

  function refreshSyncStatus() {
    try {
      if (window.CurriculoSyncStatus && typeof window.CurriculoSyncStatus.refresh === "function") {
        window.CurriculoSyncStatus.refresh();
      }

      if (
        window.parent &&
        window.parent !== window &&
        window.parent.CurriculoSyncStatus &&
        typeof window.parent.CurriculoSyncStatus.refresh === "function"
      ) {
        window.parent.CurriculoSyncStatus.refresh();
      }
    } catch (error) {
      return;
    }
  }

  MAT.firebase = {
    app: null,
    db: null,
    ready: false,

    init: function () {
      var cfg;

      if (this.ready && this.db) {
        return this.db;
      }

      if (!window.firebase || !window.firebase.initializeApp || !window.firebase.firestore) {
        console.error("MAT: Firebase SDK no está cargado.");
        return null;
      }

      cfg = MAT.config.getFirebaseConfig();

      if (!MAT.config.isFirebaseConfigComplete(cfg)) {
        console.warn("MAT: Configuración de Firebase incompleta.");
        return null;
      }

      if (window.firebase.apps && window.firebase.apps.length > 0) {
        this.app = window.firebase.app();
      } else {
        this.app = window.firebase.initializeApp(cfg);
      }

      this.db = window.firebase.firestore(this.app);
      this.ready = !!this.db;

      return this.db;
    },

    getCollectionName: collectionName,
    getLocalDb: getLocalDb,
    localDisponible: localDisponible,

    guardarLocalCarrera: async function (careerId, data, options) {
      var local = getLocalDb();
      var id = clean(careerId);
      var opts = (options && typeof options === "object") ? options : {};

      if (!local || !id || typeof local.put !== "function") {
        return false;
      }

      await local.put(collectionName(), id, data || {}, {
        remoteCollection: collectionName(),
        ...opts
      });

      refreshSyncStatus();
      return true;
    },

    leerLocalCarrera: async function (careerId) {
      var local = getLocalDb();
      var id = clean(careerId);

      if (!local || !id || typeof local.get !== "function") {
        return null;
      }

      return await local.get(collectionName(), id);
    },

    listarLocalCarreras: async function () {
      var local = getLocalDb();

      if (!local || typeof local.all !== "function") {
        return [];
      }

      return await local.all(collectionName());
    }
  };
})(window);
