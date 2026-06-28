/* =========================================================
Nombre completo: carga-materia.matcher.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.matcher.js
Función o funciones:
1. Unir información base, contenidos y actividades por número de unidad.
2. Reubicar contenidos o actividades sin unidad cuando el texto o código permita inferirla.
3. Ordenar contenidos por numeración académica: 1.1, 1.1.1, 1.1.2, etc.
4. Mantener separados los elementos que no puedan relacionarse para no perder información.
5. Evitar reubicar actividades por números sueltos como semana 1 o actividad 1.
========================================================= */

(function attachCargaMateriaMatcher(window) {
  "use strict";

  function normalizer() {
    return window.LibroCargaMateriaNormalizer || null;
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    var n = normalizer();
    return n && typeof n.normalize === "function"
      ? n.normalize(value)
      : text(value).toLowerCase();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function unitFromAcademicCode(value) {
    var raw = text(value);
    var match = raw.match(/(^|\s|\|)([1-4](?:\.\d+){1,6})(?=\s|\||$)/);

    if (match && match[2]) {
      return Number(String(match[2]).split(".")[0]);
    }

    return 0;
  }

  function unitFromExplicitText(value) {
    var raw = text(value);
    var normalized = normalize(raw);
    var fromCode = unitFromAcademicCode(raw);

    if (fromCode) return fromCode;

    var unitMatch = normalized.match(/unidad\s*([1-4])/);
    if (unitMatch && unitMatch[1]) return Number(unitMatch[1]);

    return 0;
  }

  function unitFromUnitField(value) {
    var explicit = unitFromExplicitText(value);
    var simple = normalize(value).match(/^([1-4])$/);

    if (explicit) return explicit;
    if (simple && simple[1]) return Number(simple[1]);

    return 0;
  }

  function getItemUnit(item) {
    if (!item) return 0;

    return unitFromUnitField(item.unidad) ||
      unitFromExplicitText(item.codigo) ||
      unitFromExplicitText(item.codigoRelacionado) ||
      unitFromExplicitText(item.temaRelacionado) ||
      unitFromExplicitText(item.contenido);
  }

  function numericCodeParts(code) {
    return text(code)
      .split(".")
      .map(function mapPart(part) {
        var number = Number(part);
        return Number.isFinite(number) ? number : 0;
      });
  }

  function compareCodes(a, b) {
    var codeA = text(a.codigo || a.codigoRelacionado || "");
    var codeB = text(b.codigo || b.codigoRelacionado || "");

    if (!codeA && !codeB) return Number(a.orden || 0) - Number(b.orden || 0);
    if (!codeA) return 1;
    if (!codeB) return -1;

    var partsA = numericCodeParts(codeA);
    var partsB = numericCodeParts(codeB);
    var max = Math.max(partsA.length, partsB.length);

    for (var i = 0; i < max; i += 1) {
      var currentA = partsA[i] || 0;
      var currentB = partsB[i] || 0;

      if (currentA !== currentB) return currentA - currentB;
    }

    return Number(a.orden || 0) - Number(b.orden || 0);
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getBaseUnit(base, numero) {
    var units = base && base.campos ? safeArray(base.campos.unidades) : [];
    return clone(units.find(function findUnit(unit) {
      return Number(unit.numero) === numero;
    }) || {});
  }

  function getRelatedUnitItems(interpretation, listName, numero) {
    var units = interpretation ? safeArray(interpretation.unidades) : [];
    var unit = units.find(function findUnit(item) {
      return Number(item.numero) === numero;
    });

    return clone(unit && unit[listName] ? unit[listName] : []);
  }

  function relocateUnassigned(items) {
    var output = {
      byUnit: {
        1: [],
        2: [],
        3: [],
        4: []
      },
      unassigned: []
    };

    safeArray(items).forEach(function eachItem(item) {
      var cloned = clone(item);
      var unit = getItemUnit(cloned);

      if (unit >= 1 && unit <= 4) {
        cloned.unidad = unit;
        cloned.reubicadoAutomaticamente = true;
        output.byUnit[unit].push(cloned);
      } else {
        output.unassigned.push(cloned);
      }
    });

    return output;
  }

  function attachRelocated(targetUnits, relocated, key) {
    [1, 2, 3, 4].forEach(function eachUnit(numero) {
      var unit = targetUnits[numero - 1];
      var items = relocated.byUnit[numero] || [];

      if (items.length) {
        unit[key] = unit[key].concat(items);
      }
    });
  }

  function buildWarnings(units, unassignedContents, unassignedActivities) {
    var warnings = [];

    units.forEach(function eachUnit(unit) {
      if (!text(unit.nombre)) warnings.push("La Unidad " + unit.numero + " no tiene nombre detectado desde el Archivo 1.");
      if (!text(unit.competencia)) warnings.push("La Unidad " + unit.numero + " no tiene competencia detectada desde el Archivo 1.");
      if (!text(unit.resultadoAprendizaje)) warnings.push("La Unidad " + unit.numero + " no tiene resultado de aprendizaje detectado desde el Archivo 1.");
      if (!unit.contenidos.length) warnings.push("La Unidad " + unit.numero + " no tiene contenidos vinculados desde el Archivo 2.");
      if (!unit.actividades.length) warnings.push("La Unidad " + unit.numero + " no tiene actividades vinculadas desde el Archivo 3.");
    });

    if (unassignedContents.length) {
      warnings.push("Quedaron " + unassignedContents.length + " contenidos sin unidad después de la unión inteligente.");
    }

    if (unassignedActivities.length) {
      warnings.push("Quedaron " + unassignedActivities.length + " actividades sin unidad después de la unión inteligente.");
    }

    return warnings;
  }

  function summarize(units, unassignedContents, unassignedActivities) {
    return {
      unidades: units.map(function mapUnit(unit) {
        return {
          unidad: unit.numero,
          tieneNombre: Boolean(text(unit.nombre)),
          tieneCompetencia: Boolean(text(unit.competencia)),
          tieneResultadoAprendizaje: Boolean(text(unit.resultadoAprendizaje)),
          contenidos: unit.contenidos.length,
          actividades: unit.actividades.length
        };
      }),
      totales: {
        contenidos: units.reduce(function sum(total, unit) {
          return total + unit.contenidos.length;
        }, 0),
        actividades: units.reduce(function sum(total, unit) {
          return total + unit.actividades.length;
        }, 0),
        contenidosSinUnidad: unassignedContents.length,
        actividadesSinUnidad: unassignedActivities.length
      }
    };
  }

  function match(interpretacionBase, interpretacionContenidos, interpretacionActividades) {
    var units = [1, 2, 3, 4].map(function buildUnit(numero) {
      var baseUnit = getBaseUnit(interpretacionBase, numero);
      var contenidos = getRelatedUnitItems(interpretacionContenidos, "contenidos", numero);
      var actividades = getRelatedUnitItems(interpretacionActividades, "actividades", numero);

      return {
        numero: numero,
        nombre: text(baseUnit.nombre),
        competencia: text(baseUnit.competencia),
        resultadoAprendizaje: text(baseUnit.resultadoAprendizaje),
        contenidos: contenidos,
        actividades: actividades
      };
    });

    var contenidosRelocated = relocateUnassigned(interpretacionContenidos ? interpretacionContenidos.sinUnidad : []);
    var actividadesRelocated = relocateUnassigned(interpretacionActividades ? interpretacionActividades.sinUnidad : []);

    attachRelocated(units, contenidosRelocated, "contenidos");
    attachRelocated(units, actividadesRelocated, "actividades");

    units.forEach(function sortUnit(unit) {
      unit.contenidos.sort(compareCodes);
      unit.actividades.sort(compareCodes);
    });

    return {
      unidades: units,
      sinUnidad: {
        contenidos: contenidosRelocated.unassigned,
        actividades: actividadesRelocated.unassigned
      },
      resumen: summarize(units, contenidosRelocated.unassigned, actividadesRelocated.unassigned),
      advertencias: buildWarnings(units, contenidosRelocated.unassigned, actividadesRelocated.unassigned)
    };
  }

  window.LibroCargaMateriaMatcher = {
    match: match
  };
})(window);
