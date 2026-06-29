/*
Nombre del archivo: mat.config.js
Ubicación: /Curriculo/materias/frontend/core/mat.config.js
Función:
- Configuración global del módulo Materias
- Selectores del DOM
- Tipos de carga
- Límites de negocio
- Firebase
- Estado de base local y sincronización
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.config = {
    appName: "materias",
    moduleName: "Currículo · Materias",
    collectionName: "carreras",
    localStorageKey: "curriculo_materias_state_v1",
    defaultLoadType: "materias-carrera",

    selectors: {
      status: "#mat-status",
      syncStatus: "#mat-sync-status",
      careerSelect: "#mat-career-select",
      careerTypeDisplay: "#mat-career-type-display",
      careerQuickSummary: "#mat-career-quick-summary",
      loadTypeSelect: "#mat-load-type-select",
      loadTypeMenu: "#mat-load-type-menu",
      refreshButton: "#mat-refresh-btn",
      saveButton: "#mat-save-btn",
      openMassiveButton: "#mat-open-massive-btn",
      processButton: "#mat-modal-process-btn",
      clearButton: "#mat-modal-clear-btn",
      applyMassiveButton: "#mat-modal-apply-btn",
      massiveInput: "#mat-modal-massive-input",
      previewBody: "#mat-modal-preview-body",
      editor: "#mat-editor",
      editorHint: "#mat-editor-hint",
      saveSummary: "#mat-save-summary",
      modal: "#mat-massive-modal",
      modalPanel: "#mat-massive-modal-panel",
      modalClose: "#mat-modal-close-btn",
      modalStatus: "#mat-modal-status"
    },

    loadTypes: [
      { value: "materias-carrera", label: "De carrera" },
      { value: "transversales", label: "Transversales" },
      { value: "nucleos", label: "Núcleos" },
      { value: "ejes", label: "Ejes" }
    ],

    limits: {
      materiasCarrera: { minPerLevel: 4, maxPerLevel: 6, levels: 4 },
      transversales: { minTotal: 1, maxTotal: 3, levels: 4 },
      nucleos: { exactTotal: 4 },
      ejes: { universitaria: 6, superior: 4, tecnica: 4 }
    },

    firebaseConfig: {
      apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
      authDomain: "utet-4387a.firebaseapp.com",
      projectId: "utet-4387a",
      storageBucket: "utet-4387a.firebasestorage.app",
      messagingSenderId: "902848131454",
      appId: "1:902848131454:web:47f515eb6480834724c32f"
    }
  };

  MAT.config.isFirebaseConfigComplete = function (cfg) {
    if (!cfg || typeof cfg !== "object") return false;

    return !!(
      cfg.apiKey &&
      cfg.authDomain &&
      cfg.projectId &&
      cfg.storageBucket &&
      cfg.messagingSenderId &&
      cfg.appId
    );
  };

  MAT.config.getFirebaseConfig = function () {
    if (window.__MAT_FIREBASE_CONFIG__ && typeof window.__MAT_FIREBASE_CONFIG__ === "object") {
      return window.__MAT_FIREBASE_CONFIG__;
    }

    return MAT.config.firebaseConfig;
  };
})(window);
