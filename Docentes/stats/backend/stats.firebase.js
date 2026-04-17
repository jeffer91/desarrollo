/*
Nombre del archivo: stats.firebase.js
Ruta: stats/backend/stats.firebase.js
Función:
- Inicializa Firebase con SDK compat por CDN
- Reutiliza la app si ya existe
- Entrega acceso seguro a Firestore
*/

(function attachStatsFirebase(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var cachedApp = null;
  var cachedDb = null;

  function getFirebaseRoot() {
    return window.firebase || null;
  }

  function getConfig() {
    if (window.STATS_FIREBASE_CONFIG && typeof window.STATS_FIREBASE_CONFIG === "object") {
      return window.STATS_FIREBASE_CONFIG;
    }

    return null;
  }

  function hasRequiredConfig(config) {
    return !!(
      config &&
      typeof config === "object" &&
      config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
    );
  }

  function getExistingApp(firebase) {
    try {
      if (!firebase || !Array.isArray(firebase.apps) || !firebase.apps.length) {
        return null;
      }
      return firebase.apps[0] || null;
    } catch (error) {
      return null;
    }
  }

  function init() {
    var firebase = getFirebaseRoot();
    var config = getConfig();

    if (!firebase) {
      return {
        ok: false,
        message: "Firebase no está cargado en la página."
      };
    }

    if (!hasRequiredConfig(config)) {
      return {
        ok: false,
        message: "La configuración de Firebase está incompleta."
      };
    }

    if (cachedApp && cachedDb) {
      return {
        ok: true,
        app: cachedApp,
        db: cachedDb
      };
    }

    try {
      var app = getExistingApp(firebase);

      if (!app) {
        app = firebase.initializeApp(config);
      }

      if (!firebase.firestore || typeof firebase.firestore !== "function") {
        return {
          ok: false,
          message: "Firestore no está disponible en este proyecto."
        };
      }

      var db = firebase.firestore();

      cachedApp = app;
      cachedDb = db;

      return {
        ok: true,
        app: cachedApp,
        db: cachedDb
      };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : "No se pudo inicializar Firebase."
      };
    }
  }

  function getDb() {
    var result = init();
    return result.ok ? result.db : null;
  }

  function getStatus() {
    return init();
  }

  window.STATS.Firebase = {
    init: init,
    getDb: getDb,
    getStatus: getStatus
  };
})(window);