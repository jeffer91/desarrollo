/* =========================================================
Nombre del archivo: prioridad.db.core.js
Ruta: /prioridad/prioridad.db.core.js
Función:
- assertDb + referencia de colecciones
- ✅ NUEVO: colección de familias
- ✅ Compat: mantiene COL como alias de events para no romper módulos antiguos
========================================================= */
(function(){
  const COL = "events";                 // compat
  const COL_EVENTS = "events";
  const COL_FAMILIES = "eventFamilies"; // ✅ NUEVO

  function assertDb(){
    if (!window.db) throw new Error("Firestore no inicializado (window.db).");
    return window.db;
  }

  window.PrioridadDBCore = {
    COL,
    COL_EVENTS,
    COL_FAMILIES,
    assertDb
  };
})();