/*
Nombre del archivo: pea.firebase.js
Ubicación: /Curriculo/pea_documentos/pea.firebase.js
Función:
- Inicializar Firebase sin duplicar la app
- Exponer Firestore y Storage para PEA
- Detectar la base local central de Currículo cuando exista
- Dar helpers para sincronización visual local
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  var defaultConfig = {
    apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
    authDomain: "utet-4387a.firebaseapp.com",
    projectId: "utet-4387a",
    storageBucket: "utet-4387a.firebasestorage.app",
    messagingSenderId: "902848131454",
    appId: "1:902848131454:web:47f515eb6480834724c32f"
  };

  function fromParent(name) {
    try {
      if (window.parent && window.parent !== window && window.parent[name]) return window.parent[name];
    } catch (error) {
      return null;
    }
    return null;
  }

  PEA.firebase = {
    app: null,
    db: null,
    storage: null,
    ready: false,

    getConfig: function () {
      return window.__PEA_FIREBASE_CONFIG__ || window.__CURRICULO_FIREBASE_CONFIG__ || defaultConfig;
    },

    init: function () {
      if (this.ready && this.app && this.db) return true;
      if (!window.firebase || !window.firebase.initializeApp || !window.firebase.firestore) {
        console.warn("PEA: Firebase no está cargado. Se usará local si está disponible.");
        return false;
      }
      try {
        this.app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(this.getConfig());
        this.db = window.firebase.firestore(this.app);
        this.storage = window.firebase.storage ? window.firebase.storage(this.app) : null;
        this.ready = !!this.db;
        return this.ready;
      } catch (error) {
        console.error("PEA: Error al inicializar Firebase:", error);
        this.ready = false;
        return false;
      }
    },

    getDb: function () {
      return this.init() ? this.db : null;
    },

    getStorage: function () {
      this.init();
      return this.storage || null;
    },

    getServerTimestamp: function () {
      if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
        return window.firebase.firestore.FieldValue.serverTimestamp();
      }
      return new Date();
    },

    getLocalDb: function () {
      return window.CurriculoLocal || fromParent("CurriculoLocal") || null;
    },

    getSyncStatus: function () {
      return window.CurriculoSyncStatus || fromParent("CurriculoSyncStatus") || null;
    },

    getSyncEngine: function () {
      return window.CurriculoSync || fromParent("CurriculoSync") || null;
    },

    localDisponible: function () {
      var local = this.getLocalDb();
      return !!(local && typeof local.put === "function" && typeof local.get === "function" && typeof local.all === "function");
    },

    refreshLocalStatus: async function () {
      var status = this.getSyncStatus();
      if (status && typeof status.refresh === "function") return await status.refresh();
      return null;
    },

    syncCurriculoNow: async function () {
      var sync = this.getSyncEngine();
      if (sync && typeof sync.syncNow === "function") return await sync.syncNow({ force: true });
      return { ok: false, skipped: true, reason: "Sin motor general de sincronización." };
    }
  };
})(window);
