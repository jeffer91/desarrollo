/* =========================================================
Nombre completo: titulacion-brain-modalidad.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-modalidad.js
Función o funciones:
- Detectar si una carrera pertenece a modalidad presencial u online.
- Clasificar registros por modalidad.
- Separar automáticamente informes presenciales, online y PVC.
- Evitar que la modalidad dependa de escritura manual.
========================================================= */

(function (window) {
  "use strict";

  function config() {
    return window.TITULACION_CONFIG || {};
  }

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    var U = utils();
    if (typeof U.normalizeText === "function") return U.normalizeText(value);

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function getOnlineKeywords() {
    var cfg = config();
    var keywords =
      cfg.modalidadKeywords &&
      Array.isArray(cfg.modalidadKeywords.online)
        ? cfg.modalidadKeywords.online
        : ["online", "virtual", "en linea", "en línea", "distancia"];

    return keywords.map(normalize);
  }

  function getCarreraText(row) {
    var r = row || {};

    return asText(
      r.carrera ||
      r.Carrera ||
      r.CARRERA ||
      r.programa ||
      r.Programa ||
      r.nombreCarrera ||
      r.NombreCarrera ||
      ""
    );
  }

  function isOnlineText(value) {
    var text = normalize(value);
    var keywords = getOnlineKeywords();

    for (var i = 0; i < keywords.length; i += 1) {
      if (text.indexOf(keywords[i]) >= 0) {
        return true;
      }
    }

    return false;
  }

  function classifyCarrera(carrera) {
    var name = asText(carrera);
    var online = isOnlineText(name);

    return {
      carrera: name,
      modalidad: online ? "online" : "presencial",
      modalidadLabel: online ? "Modalidad Online" : "Modalidad Presencial",
      esOnline: online,
      esPresencial: !online
    };
  }

  function classifyRow(row) {
    var carrera = getCarreraText(row);
    var classification = classifyCarrera(carrera);

    return Object.assign({}, row || {}, {
      carreraNormalizada: carrera,
      modalidadDetectada: classification.modalidad,
      modalidadLabel: classification.modalidadLabel,
      esOnline: classification.esOnline,
      esPresencial: classification.esPresencial
    });
  }

  function classifyRows(rows) {
    var list = Array.isArray(rows) ? rows : [];

    return list.map(classifyRow);
  }

  function splitByModalidad(rows) {
    var classified = classifyRows(rows);

    return {
      presencial: classified.filter(function (row) {
        return row.modalidadDetectada === "presencial";
      }),
      online: classified.filter(function (row) {
        return row.modalidadDetectada === "online";
      }),
      all: classified
    };
  }

  function getModalidadesPresentes(rows) {
    var split = splitByModalidad(rows);
    var out = [];

    if (split.presencial.length > 0) {
      out.push({
        key: "presencial",
        label: "Modalidad Presencial",
        total: split.presencial.length
      });
    }

    if (split.online.length > 0) {
      out.push({
        key: "online",
        label: "Modalidad Online",
        total: split.online.length
      });
    }

    return out;
  }

  function shouldGenerateOnline(rows) {
    return splitByModalidad(rows).online.length > 0;
  }

  function shouldGeneratePresencial(rows) {
    return splitByModalidad(rows).presencial.length > 0;
  }

  function getDocumentTypeForPeriodo(periodoInfo, modalidad) {
    var p = periodoInfo || {};
    var mod = asText(modalidad).toLowerCase();

    if (p.esPVC || p.tipo === "pvc") {
      return {
        key: "pvc",
        label: "Programa de Validación de Conocimientos",
        modalidad: "pvc"
      };
    }

    if (mod === "online") {
      return {
        key: "online",
        label: "Modalidad Online",
        modalidad: "online"
      };
    }

    return {
      key: "presencial",
      label: "Modalidad Presencial",
      modalidad: "presencial"
    };
  }

  window.TITULACION_BRAIN_MODALIDAD = {
    getOnlineKeywords: getOnlineKeywords,
    getCarreraText: getCarreraText,
    isOnlineText: isOnlineText,
    classifyCarrera: classifyCarrera,
    classifyRow: classifyRow,
    classifyRows: classifyRows,
    splitByModalidad: splitByModalidad,
    getModalidadesPresentes: getModalidadesPresentes,
    shouldGenerateOnline: shouldGenerateOnline,
    shouldGeneratePresencial: shouldGeneratePresencial,
    getDocumentTypeForPeriodo: getDocumentTypeForPeriodo
  };
})(window);