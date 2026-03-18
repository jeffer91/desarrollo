/*
Nombre del archivo: cale.db.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.db.js
Función:
- Lectura independiente de Firestore para el módulo cale
- Usa una configuración propia del módulo
- Crea o reutiliza una app Firebase aislada para evitar conflictos
- Lee eventos desde events y familias desde eventFamilies
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  var CALE_APP_NAME = "caleApp";

  function getConfigCandidates() {
    var candidates = [];

    if (window.CALE_FIREBASE_CONFIG && typeof window.CALE_FIREBASE_CONFIG === "object") {
      candidates.push(window.CALE_FIREBASE_CONFIG);
    }

    if (window.CALE && window.CALE.config && Array.isArray(window.CALE.config.firebaseConfigCandidates)) {
      window.CALE.config.firebaseConfigCandidates.forEach(function (key) {
        if (window[key] && typeof window[key] === "object") {
          candidates.push(window[key]);
        }
      });
    }

    if (window.__env && window.__env.firebaseConfig && typeof window.__env.firebaseConfig === "object") {
      candidates.push(window.__env.firebaseConfig);
    }

    return candidates;
  }

  function getFirstValidConfig() {
    var candidates = getConfigCandidates();

    for (var i = 0; i < candidates.length; i += 1) {
      var cfg = candidates[i];

      if (
        cfg &&
        typeof cfg === "object" &&
        cfg.apiKey &&
        cfg.projectId &&
        cfg.appId
      ) {
        return cfg;
      }
    }

    return null;
  }

  function ensureFirebaseLibrary() {
    if (!window.firebase || typeof window.firebase.initializeApp !== "function") {
      throw new Error("No se encontró la librería Firebase en esta pantalla.");
    }

    if (typeof window.firebase.firestore !== "function") {
      throw new Error("No se encontró Firestore en esta pantalla.");
    }
  }

  function sameProject(app, cfg) {
    try {
      var options = app && app.options ? app.options : {};
      return String(options.projectId || "") === String(cfg.projectId || "");
    } catch (err) {
      return false;
    }
  }

  function sameApp(app, cfg) {
    try {
      var options = app && app.options ? app.options : {};
      return (
        String(options.projectId || "") === String(cfg.projectId || "") &&
        String(options.appId || "") === String(cfg.appId || "")
      );
    } catch (err) {
      return false;
    }
  }

  function getExistingNamedApp() {
    try {
      return window.firebase.app(CALE_APP_NAME);
    } catch (err) {
      return null;
    }
  }

  function getDefaultApp() {
    try {
      if (window.firebase.apps && window.firebase.apps.length) {
        return window.firebase.app();
      }
    } catch (err) {}
    return null;
  }

  function getOrCreateScopedApp(cfg) {
    var namedApp = getExistingNamedApp();
    if (namedApp) return namedApp;

    var defaultApp = getDefaultApp();
    if (defaultApp && sameApp(defaultApp, cfg)) {
      return defaultApp;
    }

    return window.firebase.initializeApp(cfg, CALE_APP_NAME);
  }

  function ensureFirestore() {
    ensureFirebaseLibrary();

    var cfg = getFirstValidConfig();
    if (!cfg) {
      throw new Error("No se encontró una configuración de Firebase disponible para este módulo.");
    }

    var app = getOrCreateScopedApp(cfg);

    if (!app || typeof app.firestore !== "function") {
      throw new Error("No fue posible inicializar Firestore para este módulo.");
    }

    return app.firestore();
  }

  function mapSnapshot(snapshot) {
    return snapshot.docs.map(function (doc) {
      return {
        id: doc.id,
        data: doc.data() || {}
      };
    });
  }

  function normalizeDateValue(value) {
    return String(value || "").trim();
  }

  function normalizeTimeValue(value) {
    var text = String(value || "").trim();
    if (!text) return "99:99";
    return text.length === 5 ? text : text.slice(0, 5);
  }

  function sortEvents(items) {
    return items.sort(function (a, b) {
      var ad = normalizeDateValue(a && a.data ? a.data.date : "");
      var bd = normalizeDateValue(b && b.data ? b.data.date : "");

      if (ad < bd) return -1;
      if (ad > bd) return 1;

      var at = normalizeTimeValue(a && a.data ? a.data.time : "");
      var bt = normalizeTimeValue(b && b.data ? b.data.time : "");

      if (at < bt) return -1;
      if (at > bt) return 1;

      var an = String(a && a.data ? a.data.title || "" : "").toLowerCase();
      var bn = String(b && b.data ? b.data.title || "" : "").toLowerCase();

      if (an < bn) return -1;
      if (an > bn) return 1;

      return 0;
    });
  }

  function familyLabel(item) {
    var data = item && item.data ? item.data : {};
    return String(data.name || data.title || data.label || "").trim().toLowerCase();
  }

  function sortFamilies(items) {
    return items.sort(function (a, b) {
      var al = familyLabel(a);
      var bl = familyLabel(b);

      if (al < bl) return -1;
      if (al > bl) return 1;
      return 0;
    });
  }

  async function getEvents() {
    var db = ensureFirestore();
    var collectionName = window.CALE.config.db.collectionEvents;

    var snapshot = await db.collection(collectionName).get();
    return sortEvents(mapSnapshot(snapshot));
  }

  async function getFamilies() {
    var db = ensureFirestore();
    var collectionName = window.CALE.config.db.collectionFamilies;

    try {
      var snapshot = await db.collection(collectionName).get();
      return sortFamilies(mapSnapshot(snapshot));
    } catch (err) {
      return [];
    }
  }

  async function testConnection() {
    var db = ensureFirestore();
    var collectionName = window.CALE.config.db.collectionEvents;

    await db.collection(collectionName).limit(1).get();
    return true;
  }

  async function setEventStatus(id, status) {
    var safeId = String(id || "").trim();
    if (!safeId) throw new Error("ID de evento inválido.");

    var db = ensureFirestore();
    var collectionName = window.CALE.config.db.collectionEvents;

    // ✅ Corrección: agregar escritura controlada para cambiar el estado (ej: "realizado")
    // Evita tener que borrar documentos y permite filtrar/ocultar eventos por estado.
    await db.collection(collectionName).doc(safeId).set(
      { status: String(status || "").trim() },
      { merge: true }
    );

    return true;
  }

  async function updateEvent(id, patch) {
    var safeId = String(id || "").trim();
    var safePatch = patch && typeof patch === "object" ? patch : null;
    if (!safeId) throw new Error("ID de evento inválido.");
    if (!safePatch) throw new Error("Datos de evento inválidos.");

    var db = ensureFirestore();
    var collectionName = window.CALE.config.db.collectionEvents;

    // ✅ Corrección: permite guardar cambios del popup sin reemplazar el documento completo.
    // Usa merge para actualizar solo los campos editados y evitar pérdida de datos.
    await db.collection(collectionName).doc(safeId).set(safePatch, { merge: true });
    return true;
  }

  window.CALE.db = {
    getEvents: getEvents,
    getFamilies: getFamilies,
    testConnection: testConnection,
    setEventStatus: setEventStatus, // ✅ expone la acción para el panel Detalle
    updateEvent: updateEvent, // ✅ expone guardado general para edición desde el popup
    ensureFirestore: ensureFirestore,
    sameProject: sameProject
  };

})(window);