/*
Nombre del archivo: stats.adapters.js
Ruta: stats/backend/stats.adapters.js
Función:
- Adaptador de referencias entre docentes y capacitaciones
- Intenta resolver ids heterogéneos
- Soporta id real, slug de nombre y variantes compactadas
*/

(function attachStatsAdapters(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function getHelpers() {
    return window.STATS.Helpers || {};
  }

  function asArray(value) {
    var helpers = getHelpers();
    return helpers.asArray ? helpers.asArray(value) : (Array.isArray(value) ? value : []);
  }

  function asString(value) {
    var helpers = getHelpers();
    return helpers.asString ? helpers.asString(value, "") : (value == null ? "" : String(value).trim());
  }

  function slugify(value) {
    var helpers = getHelpers();
    if (helpers.slugify) return helpers.slugify(value);

    return asString(value)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  function compactKey(value) {
    return asString(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function buildCapIndex(capacitaciones) {
    var byExactId = {};
    var bySlug = {};
    var byCompactName = {};

    asArray(capacitaciones).forEach(function eachCap(capacitacion) {
      if (!capacitacion || !capacitacion.id) return;

      var exactId = asString(capacitacion.id);
      var nameSlug = slugify(capacitacion.nombre);
      var compactName = compactKey(capacitacion.nombre);

      byExactId[exactId] = capacitacion;

      if (nameSlug) bySlug[nameSlug] = capacitacion;
      if (compactName) byCompactName[compactName] = capacitacion;
    });

    return {
      byExactId: byExactId,
      bySlug: bySlug,
      byCompactName: byCompactName
    };
  }

  function resolveCapacitacionRef(refValue, capIndex) {
    var raw = asString(refValue);
    if (!raw || !capIndex) return null;

    if (capIndex.byExactId && capIndex.byExactId[raw]) {
      return capIndex.byExactId[raw];
    }

    var refSlug = slugify(raw);
    if (refSlug && capIndex.bySlug && capIndex.bySlug[refSlug]) {
      return capIndex.bySlug[refSlug];
    }

    var refCompact = compactKey(raw);
    if (refCompact && capIndex.byCompactName && capIndex.byCompactName[refCompact]) {
      return capIndex.byCompactName[refCompact];
    }

    return null;
  }

  window.STATS.Adapters = {
    buildCapIndex: buildCapIndex,
    resolveCapacitacionRef: resolveCapacitacionRef,
    compactKey: compactKey
  };
})(window);