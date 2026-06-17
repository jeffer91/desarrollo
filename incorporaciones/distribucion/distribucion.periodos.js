/*
=========================================================
Nombre completo: distribucion.periodos.js
Ruta o ubicación: /incorporaciones/distribucion/distribucion.periodos.js

Función o funciones:
- Obtener períodos existentes para la pantalla Distribución.
- Leer períodos desde gestores existentes si están cargados.
- Leer períodos directamente desde Firebase si está disponible.
- Leer períodos guardados en localStorage.
- Evitar que el selector quede vacío si no hay fuente activa.
- Entregar períodos normalizados como { id, nombre }.

Con qué se une:
- distribucion.app.js
- distribucion.dom.js
- distribucion.state.js
- sedes/js/firebase-config.js si está disponible
- sedes/js/periodos-manager.js si está disponible
=========================================================
*/

(function () {
  "use strict";

  const PERIODOS_RESPALDO = [
    {
      id: "OCTUBRE 2025 - MARZO 2026",
      nombre: "OCTUBRE 2025 - MARZO 2026"
    },
    {
      id: "ABRIL 2025 - SEPTIEMBRE 2025",
      nombre: "ABRIL 2025 - SEPTIEMBRE 2025"
    },
    {
      id: "OCTUBRE 2024 - MARZO 2025",
      nombre: "OCTUBRE 2024 - MARZO 2025"
    }
  ];

  async function loadPeriodos() {
    const fromManager = await tryFromPeriodosManager();
    if (fromManager.length > 0) {
      return normalizePeriodos(fromManager);
    }

    const fromGlobalFunctions = await tryFromGlobalFunctions();
    if (fromGlobalFunctions.length > 0) {
      return normalizePeriodos(fromGlobalFunctions);
    }

    const fromFirebase = await tryFromFirebase();
    if (fromFirebase.length > 0) {
      return normalizePeriodos(fromFirebase);
    }

    const fromGlobalData = tryFromGlobalData();
    if (fromGlobalData.length > 0) {
      return normalizePeriodos(fromGlobalData);
    }

    const fromLocalStorage = tryFromLocalStorage();
    if (fromLocalStorage.length > 0) {
      return normalizePeriodos(fromLocalStorage);
    }

    return normalizePeriodos(PERIODOS_RESPALDO);
  }

  async function tryFromPeriodosManager() {
    const managers = [
      window.PeriodosManager,
      window.IncorporacionesPeriodos,
      window.periodosManager
    ];

    const methods = [
      "obtenerPeriodos",
      "listar",
      "getPeriodos",
      "cargarPeriodos"
    ];

    for (const manager of managers) {
      if (!manager) {
        continue;
      }

      for (const method of methods) {
        try {
          if (typeof manager[method] === "function") {
            const result = await manager[method]();
            const list = extractArray(result);
            if (list.length > 0) {
              return list;
            }
          }
        } catch (error) {
          console.warn("No se pudo leer períodos desde gestor:", method, error);
        }
      }
    }

    return [];
  }

  async function tryFromGlobalFunctions() {
    const functions = [
      "obtenerPeriodosFirebase",
      "mjsObtenerPeriodosMensaje",
      "cargarPeriodosFirebase",
      "obtenerPeriodos"
    ];

    for (const functionName of functions) {
      try {
        if (typeof window[functionName] === "function") {
          const result = await window[functionName]();
          const list = extractArray(result);
          if (list.length > 0) {
            return list;
          }
        }
      } catch (error) {
        console.warn("No se pudo leer períodos desde función global:", functionName, error);
      }
    }

    return [];
  }

  async function tryFromFirebase() {
    try {
      const baseDb = getFirebaseDb();
      if (!baseDb || typeof baseDb.collection !== "function") {
        return [];
      }

      const collections = getPeriodosCollectionNames();

      for (const collectionName of collections) {
        try {
          const snapshot = await baseDb.collection(collectionName).get();
          const periodos = [];

          snapshot.forEach(function (doc) {
            const data = doc.data() || {};
            periodos.push({
              docId: doc.id,
              id: data.id || data.periodoId || data.codigo || doc.id,
              nombre:
                data.label ||
                data.nombre ||
                data.periodo ||
                data.descripcion ||
                data.id ||
                doc.id,
              label: data.label,
              ordenPeriodo: data.ordenPeriodo || data.orden || 0,
              activoConsulta: data.activoConsulta === true,
              raw: data
            });
          });

          if (periodos.length > 0) {
            return sortPeriodos(periodos);
          }
        } catch (error) {
          console.warn("No se pudo leer colección de períodos:", collectionName, error);
        }
      }
    } catch (error) {
      console.warn("No se pudo leer períodos desde Firebase:", error);
    }

    return [];
  }

  function getFirebaseDb() {
    if (window.db && typeof window.db.collection === "function") {
      return window.db;
    }

    try {
      if (typeof db !== "undefined" && db && typeof db.collection === "function") {
        return db;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function getPeriodosCollectionNames() {
    const names = [];

    try {
      if (
        typeof APP_COLLECTIONS !== "undefined" &&
        APP_COLLECTIONS &&
        APP_COLLECTIONS.periodos
      ) {
        names.push(APP_COLLECTIONS.periodos);
      }
    } catch (error) {
      console.warn("No se pudo leer APP_COLLECTIONS.periodos:", error);
    }

    names.push("periodos");
    names.push("Periodos");
    names.push("incorporaciones_periodos");

    return Array.from(new Set(names.filter(Boolean)));
  }

  function tryFromGlobalData() {
    const candidates = [
      window.INCORPORACIONES_PERIODOS,
      window.periodosIncorporaciones,
      window.periodos,
      window.PERIODOS,
      window.CERTI_PERIODOS
    ];

    for (const candidate of candidates) {
      const list = extractArray(candidate);
      if (list.length > 0) {
        return list;
      }
    }

    return [];
  }

  function tryFromLocalStorage() {
    const keys = [
      "incorporaciones.periodos",
      "incorporaciones_periodos",
      "periodos_incorporaciones",
      "periodos",
      "periodos-manager",
      "certi.periodos",
      "itsqmet_periodos_incorporaciones",
      "incorporaciones_app_backup_json"
    ];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        const list = extractArray(parsed);

        if (list.length > 0) {
          return list;
        }

        if (parsed && Array.isArray(parsed.periodos)) {
          return parsed.periodos;
        }

        if (parsed && Array.isArray(parsed.data)) {
          return parsed.data;
        }

        if (parsed && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      } catch (error) {
        console.warn("No se pudo leer períodos desde localStorage:", key, error);
      }
    }

    return [];
  }

  function extractArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    if (Array.isArray(value.periodos)) {
      return value.periodos;
    }

    if (Array.isArray(value.data)) {
      return value.data;
    }

    if (Array.isArray(value.items)) {
      return value.items;
    }

    if (Array.isArray(value.result)) {
      return value.result;
    }

    return [];
  }

  function normalizePeriodos(items) {
    const map = new Map();

    (items || []).forEach(function (item, index) {
      if (!item) {
        return;
      }

      const id =
        item.id ||
        item.periodoId ||
        item.codigo ||
        item.docId ||
        item.value ||
        item.nombre ||
        item.label ||
        item.periodo ||
        `periodo_${index + 1}`;

      const nombre =
        item.nombre ||
        item.label ||
        item.texto ||
        item.periodo ||
        item.descripcion ||
        item.id ||
        id;

      if (!id || !nombre) {
        return;
      }

      map.set(String(id), {
        id: String(id),
        nombre: String(nombre),
        ordenPeriodo: Number(item.ordenPeriodo || item.orden || 0),
        activoConsulta: item.activoConsulta === true
      });
    });

    return sortPeriodos(Array.from(map.values()));
  }

  function sortPeriodos(periodos) {
    return (periodos || []).sort(function (a, b) {
      const ordenA = Number(a.ordenPeriodo || 0);
      const ordenB = Number(b.ordenPeriodo || 0);

      if (ordenA !== ordenB) {
        return ordenB - ordenA;
      }

      return String(b.nombre || "").localeCompare(String(a.nombre || ""));
    });
  }

  window.DistribucionPeriodos = {
    loadPeriodos
  };
})();