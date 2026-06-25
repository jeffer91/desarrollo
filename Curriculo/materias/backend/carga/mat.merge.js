/*
Nombre del archivo: mat.merge.js
Ubicación: /Curriculo/materias/backend/carga/mat.merge.js
Función:
- Convertir la vista previa en un patch listo para guardar
- Distribuir datos sin nivel de forma inteligente
- Construir advertencias y estadísticas
- Evitar duplicados sin perder el orden original
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.merge = MAT.merge || {};

  function cleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function keyText(value) {
    return cleanText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function cleanArray(list) {
    var seen = Object.create(null);

    if (!Array.isArray(list)) return [];

    return list
      .map(cleanText)
      .filter(function (item) { return !!item; })
      .filter(function (item) {
        var key = keyText(item);
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
  }

  function cloneLevels(source) {
    source = source || {};

    return {
      nivel1: cleanArray(source.nivel1),
      nivel2: cleanArray(source.nivel2),
      nivel3: cleanArray(source.nivel3),
      nivel4: cleanArray(source.nivel4)
    };
  }

  function countLevelItems(levels) {
    return levels.nivel1.length + levels.nivel2.length + levels.nivel3.length + levels.nivel4.length;
  }

  function shortestLevelKey(levels, maxPerLevel) {
    var keys = ["nivel1", "nivel2", "nivel3", "nivel4"];
    var chosen = keys[0];
    var chosenLen = Number.MAX_SAFE_INTEGER;

    keys.forEach(function (key) {
      var size = Array.isArray(levels[key]) ? levels[key].length : 0;
      if (size < chosenLen && size < maxPerLevel) {
        chosen = key;
        chosenLen = size;
      }
    });

    if (chosenLen !== Number.MAX_SAFE_INTEGER) return chosen;

    chosen = keys[0];
    chosenLen = levels[chosen].length;

    keys.slice(1).forEach(function (key) {
      var size = levels[key].length;
      if (size < chosenLen) {
        chosen = key;
        chosenLen = size;
      }
    });

    return chosen;
  }

  function distributeSmart(levels, extraItems, maxPerLevel) {
    var extras = cleanArray(extraItems);
    var assigned = 0;

    extras.forEach(function (item) {
      var key = shortestLevelKey(levels, maxPerLevel);
      levels[key].push(item);
      assigned += 1;
    });

    return assigned;
  }

  function distributeSequential(levels, extraItems) {
    var extras = cleanArray(extraItems);
    var keys = ["nivel1", "nivel2", "nivel3", "nivel4"];
    var assigned = 0;

    extras.forEach(function (item, index) {
      levels[keys[index % keys.length]].push(item);
      assigned += 1;
    });

    return assigned;
  }

  function buildMateriasCarrera(preview) {
    var summary = (preview && preview.summary) || {};
    var limits = (MAT.config && MAT.config.limits && MAT.config.limits.materiasCarrera) || {};
    var maxPerLevel = Number(limits.maxPerLevel || 6);
    var minPerLevel = Number(limits.minPerLevel || 4);
    var levels = cloneLevels(summary);
    var extras = cleanArray(summary.sinNivel);
    var assigned = distributeSmart(levels, extras, maxPerLevel);
    var warnings = [];

    ["nivel1", "nivel2", "nivel3", "nivel4"].forEach(function (key) {
      var total = levels[key].length;
      if (total > 0 && total < minPerLevel) warnings.push(key + " tiene menos del mínimo recomendado de " + minPerLevel + ".");
      if (total > maxPerLevel) warnings.push(key + " supera el máximo recomendado de " + maxPerLevel + ".");
    });

    return {
      patch: {
        materiasNivel1: levels.nivel1,
        materiasNivel2: levels.nivel2,
        materiasNivel3: levels.nivel3,
        materiasNivel4: levels.nivel4
      },
      warnings: warnings,
      stats: {
        totalAsignado: countLevelItems(levels),
        sinNivelDetectado: extras.length,
        sinNivelReubicado: assigned
      }
    };
  }

  function buildTransversales(preview) {
    var summary = (preview && preview.summary) || {};
    var limits = (MAT.config && MAT.config.limits && MAT.config.limits.transversales) || {};
    var maxTotal = Number(limits.maxTotal || 3);
    var minTotal = Number(limits.minTotal || 1);
    var levels = cloneLevels(summary);
    var extras = cleanArray(summary.sinNivel);
    var assigned = distributeSequential(levels, extras);
    var total = countLevelItems(levels);
    var warnings = [];

    if (total < minTotal) warnings.push("Hay menos materias transversales de las recomendadas.");
    if (total > maxTotal) warnings.push("Las materias transversales superan el máximo recomendado de " + maxTotal + ".");

    return {
      patch: {
        materiasTransversal1: levels.nivel1,
        materiasTransversal2: levels.nivel2,
        materiasTransversal3: levels.nivel3,
        materiasTransversal4: levels.nivel4
      },
      warnings: warnings,
      stats: {
        totalAsignado: total,
        sinNivelDetectado: extras.length,
        sinNivelReubicado: assigned
      }
    };
  }

  function buildNucleos(preview) {
    var summary = (preview && preview.summary) || {};
    var items = cleanArray(summary.items).slice(0, 4);
    var expected = Number((MAT.config && MAT.config.limits && MAT.config.limits.nucleos && MAT.config.limits.nucleos.exactTotal) || 4);
    var warnings = [];

    while (items.length < expected) items.push("");

    if (cleanArray(summary.items).length !== expected) {
      warnings.push("Se esperaban " + expected + " núcleos y se detectaron " + cleanArray(summary.items).length + ".");
    }

    return {
      patch: { nucleos: items },
      warnings: warnings,
      stats: { totalAsignado: cleanArray(summary.items).length, esperado: expected }
    };
  }

  function buildEjes(preview, careerType) {
    var summary = (preview && preview.summary) || {};
    var items = cleanArray(summary.items);
    var expected = MAT.carreras.getEjesEsperados(careerType);
    var warnings = [];

    if (items.length !== expected) {
      warnings.push("Para esta carrera se esperaban " + expected + " ejes y se detectaron " + items.length + ".");
    }

    return {
      patch: { ejes: items },
      warnings: warnings,
      stats: { totalAsignado: items.length, esperado: expected }
    };
  }

  MAT.merge.fromPreview = function (currentDoc, preview, careerType) {
    var kind = cleanText(preview && preview.kind);
    var result;

    currentDoc = currentDoc || {};
    preview = preview || {};

    if (!kind) {
      throw new Error("MAT: La vista previa no indica el tipo de carga.");
    }

    if (kind === "materias-carrera") result = buildMateriasCarrera(preview);
    else if (kind === "transversales") result = buildTransversales(preview);
    else if (kind === "nucleos") result = buildNucleos(preview);
    else if (kind === "ejes") result = buildEjes(preview, careerType || currentDoc.tipo || "");
    else throw new Error("MAT: Tipo de carga no reconocido: " + kind);

    result.kind = kind;
    result.patch = result.patch || {};
    result.patch.updatedAtLocal = new Date().toISOString();

    return result;
  };
})(window);
