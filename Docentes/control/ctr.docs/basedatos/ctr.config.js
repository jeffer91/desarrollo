/* =========================================================
Nombre del archivo: ctr.config.js
Ruta - Ubicación: /control/ctr.docs/basedatos/ctr.config.js
Función:
- Config central del módulo CTR (colecciones, periodos oficiales, llaves del checklist)
- Define el nombre del campo dentro de /docentes donde se guardará:
  controlDocs.periodos[periodoId].estadoDocente
  controlDocs.periodos[periodoId].planIndividual
  controlDocs.periodos[periodoId].reporteResultados
  controlDocs.acuerdos[capId]
========================================================= */
(function attachCtrConfig(window){
  "use strict";

  window.CTR = window.CTR || {};

  var CONFIG = {
    app: { name: "Control Documentos", version: "1.1.0" },
    collections: {
      docentes: "docentes",
      capacitaciones: "capacitaciones"
    },
    // Comentario técnico:
    // estadoDocente, planIndividual y reporteResultados se guardan por periodo.
    // acuerdoPatrocinio se guarda por capacitación.
    // Estructura esperada:
    // controlDocs: {
    //   periodos: {
    //     [periodoId]: {
    //       estadoDocente,
    //       planIndividual,
    //       reporteResultados
    //     }
    //   },
    //   acuerdos: {
    //     [capId]: acuerdoPatrocinio
    //   }
    // }
    docenteField: "controlDocs",
    periodosField: "periodos",
    acuerdosField: "acuerdos",
    keys: {
      // Comentario técnico:
      // se agrega estadoDocente para distinguir docentes activos,
      // que salieron o que renunciaron dentro del período evaluado.
      estadoDocente: "estadoDocente",
      planIndividual: "planIndividual",
      acuerdoPatrocinio: "acuerdoPatrocinio",
      reporteResultados: "reporteResultados"
    },

    // Comentario técnico:
    // catálogo formal de estados persistidos.
    // Se guardan como texto estable, no como emoji,
    // para poder filtrar, exportar y validar sin ambigüedad.
    statuses: {
      docente: {
        ACTIVO: "ACTIVO",
        SALIO: "SALIO",
        RENUNCIO: "RENUNCIO"
      },
      documento: {
        TIENE: "TIENE",
        PENDIENTE: "PENDIENTE",
        NO_APLICA: "NO_APLICA",
        BLOQUEADO: "BLOQUEADO"
      }
    },

    // Comentario técnico:
    // mapa visual opcional para tabla compacta.
    // El guardado debe seguir usando los códigos de statuses.
    emojis: {
      docente: {
        ACTIVO: "🟢",
        SALIO: "🚪",
        RENUNCIO: "📝"
      },
      documento: {
        TIENE: "✅",
        PENDIENTE: "⏳",
        NO_APLICA: "⛔",
        BLOQUEADO: "🔒"
      }
    },

    // Periodos oficiales (deben coincidir con el rango oficial del módulo)
    periodos: [
      { id:"2024-10_2025-03", label:"10/2024 - 03/2025" },
      { id:"2025-04_2025-09", label:"04/2025 - 09/2025" },
      { id:"2025-10_2026-03", label:"10/2025 - 03/2026" }
    ],
    defaults: {
      allValue: "todos",
      estadoDocente: "ACTIVO",
      planIndividual: "PENDIENTE",
      acuerdoPatrocinio: "PENDIENTE",
      reporteResultados: "PENDIENTE"
    }
  };

  function getConfig(){ return CONFIG; }
  function getCollections(){ return CONFIG.collections; }
  function getPeriodos(){ return Array.isArray(CONFIG.periodos) ? CONFIG.periodos.slice() : []; }
  function getDocenteField(){ return String(CONFIG.docenteField || "controlDocs"); }
  function getPeriodosField(){ return String(CONFIG.periodosField || "periodos"); }
  function getAcuerdosField(){ return String(CONFIG.acuerdosField || "acuerdos"); }
  function getKeys(){ return Object.assign({}, CONFIG.keys); }
  function getStatuses(){
    return {
      docente: Object.assign({}, CONFIG.statuses.docente),
      documento: Object.assign({}, CONFIG.statuses.documento)
    };
  }
  function getEmojis(){
    return {
      docente: Object.assign({}, CONFIG.emojis.docente),
      documento: Object.assign({}, CONFIG.emojis.documento)
    };
  }
  function getDefaults(){ return Object.assign({}, CONFIG.defaults); }

  window.CTR.Config = {
    getConfig: getConfig,
    getCollections: getCollections,
    getPeriodos: getPeriodos,
    getDocenteField: getDocenteField,
    getPeriodosField: getPeriodosField,
    getAcuerdosField: getAcuerdosField,
    getKeys: getKeys,
    getStatuses: getStatuses,
    getEmojis: getEmojis,
    getDefaults: getDefaults
  };
})(window);