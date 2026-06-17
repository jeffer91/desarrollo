/*
Nombre del archivo: stats.filters.js
Ruta: stats/frontend/stats.filters.js
Función:
- Renderiza filtros de carrera, período, capacitación, sexo y texto
- Soporta selección múltiple de período
- Refresca derivados al cambiar cualquier filtro
*/
(function attachStatsFilters(window, document) {
  "use strict";

  window.STATS = window.STATS || {};

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asText(value) {
    return value == null ? "" : String(value).trim();
  }

  function escapeHtml(value) {
    if (window.STATS.UI && typeof window.STATS.UI.escapeHtml === "function") {
      return window.STATS.UI.escapeHtml(value);
    }

    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uniqueSorted(values) {
    var seen = {};
    return asArray(values)
      .map(function eachItem(item) {
        return asText(item);
      })
      .filter(function eachItem(item) {
        if (!item) return false;
        if (seen[item]) return false;
        seen[item] = true;
        return true;
      })
      .sort(function sorter(a, b) {
        return a.localeCompare(b, "es", { sensitivity: "base" });
      });
  }

  function getStateFilters(state) {
    return state && state.filters ? state.filters : {};
  }

  function getCrossed(state) {
    return state && state.crossed ? state.crossed : {
      docentes: [],
      capacitaciones: [],
      asignaciones: [],
      inconsistencias: []
    };
  }

  function getOptionsFromState(state) {
    var crossed = getCrossed(state);
    var filters = getStateFilters(state);
    var asignaciones = asArray(crossed.asignaciones);
    var selectedPeriodos = Array.isArray(filters.periodo)
      ? filters.periodo.filter(Boolean).map(asText).filter(Boolean)
      : [];
    var asignacionesFiltradasParaCapacitacion = selectedPeriodos.length
      ? asignaciones.filter(function eachItem(item) {
          /* Corrección:
             - Capacitaciones depende del período seleccionado.
             - La lista se arma desde asignaciones del período activo.
             - Evita mostrar capacitaciones que no pertenecen al primer filtro. */
          return selectedPeriodos.indexOf(asText(item && item.periodoLabel)) !== -1;
        })
      : asignaciones;

    return {
      carreras: uniqueSorted(asignaciones.map(function eachItem(item) {
        return item && item.carreraNombre;
      })),
      periodos: uniqueSorted(asignaciones.map(function eachItem(item) {
        return item && item.periodoLabel;
      })),
      capacitaciones: uniqueSorted(asignacionesFiltradasParaCapacitacion.map(function eachItem(item) {
        return item && item.capacitacionNombre;
      })),
      sexos: uniqueSorted(asignaciones.map(function eachItem(item) {
        return item && item.sexo;
      }))
    };
  }

  function buildSelectOptions(list, selectedValue) {
    var current = asText(selectedValue);

    return [
      '<option value="todos">Todos</option>',
      asArray(list).map(function eachItem(item) {
        var value = asText(item);
        return '<option value="' + escapeHtml(value) + '"' + (value === current ? " selected" : "") + ">" + escapeHtml(value) + "</option>";
      }).join("")
    ].join("");
  }

  function buildMultipleOptions(list, selectedValues) {
    var selectedMap = {};
    var normalized = Array.isArray(selectedValues) ? selectedValues : [];

    normalized.forEach(function eachItem(item) {
      selectedMap[asText(item)] = true;
    });

    return asArray(list).map(function eachItem(item) {
      var value = asText(item);
      return '<option value="' + escapeHtml(value) + '"' + (selectedMap[value] ? " selected" : "") + ">" + escapeHtml(value) + "</option>";
    }).join("");
  }

  function buildPeriodHelp(periodo) {
    var selected = Array.isArray(periodo) ? periodo.filter(Boolean) : [];
    if (!selected.length) {
      return '<div class="stats-summary-line">Sin selección específica. Se interpretan todos los períodos.</div>';
    }

    return '<div class="stats-summary-line">Seleccionados: ' + escapeHtml(selected.join(" | ")) + "</div>";
  }

  function getSelectedPeriodValues(host) {
    var selectors;
    var values;
    var unique;

    if (!host || !host.querySelectorAll) return [];

    /* Corrección:
       - El período ya no sale de un <select multiple>.
       - Se leen los dos selectores simples y se arma el mismo array que usa el Store.
       - Se filtra "todos" para no romper la lógica actual de derivados. */
    selectors = host.querySelectorAll('select[data-stats-filter="periodo"]');
    values = Array.prototype.slice.call(selectors).map(function eachSelect(select) {
      return asText(select.value);
    }).filter(function eachValue(value) {
      return value && value !== "todos";
    });

    unique = {};
    return values.filter(function eachValue(value) {
      if (unique[value]) return false;
      unique[value] = true;
      return true;
    });
  }

  function render(state) {
    var host = document.getElementById("statsFiltersHost");
    var filters = getStateFilters(state);
    var options = getOptionsFromState(state);
    var selectedPeriodos = Array.isArray(filters.periodo) ? filters.periodo : [];
    var periodoDesde = selectedPeriodos[0] || "todos";
    var periodoHasta = selectedPeriodos[1] || "todos";

    if (!host) return;

    host.innerHTML = [
      /* Corrección:
         - Período se renderiza primero porque es el filtro principal.
         - Solo cambia el orden visual del bloque, sin tocar ids, data attributes ni bindings. */
      '<div class="stats-field">',
      '<label>Período</label>',
      '<div class="stats-periodo-double">',
      '<select id="statsFilterPeriodoDesde" data-stats-filter="periodo">',
      buildSelectOptions(options.periodos, periodoDesde),
      "</select>",
      '<select id="statsFilterPeriodoHasta" data-stats-filter="periodo">',
      buildSelectOptions(options.periodos, periodoHasta),
      "</select>",
      "</div>",
      buildPeriodHelp(filters.periodo),
      "</div>",

      '<div class="stats-filters-grid" style="margin-top:14px;">',
      '<div class="stats-field">',
      '<label for="statsFilterCarrera">Carrera</label>',
      '<select id="statsFilterCarrera" data-stats-filter="carrera">',
      buildSelectOptions(options.carreras, filters.carrera),
      "</select>",
      "</div>",

      '<div class="stats-field">',
      '<label for="statsFilterCapacitacion">Capacitación</label>',
      '<select id="statsFilterCapacitacion" data-stats-filter="capacitacion">',
      buildSelectOptions(options.capacitaciones, filters.capacitacion),
      "</select>",
      "</div>",

      '<div class="stats-field">',
      '<label for="statsFilterSexo">Sexo</label>',
      '<select id="statsFilterSexo" data-stats-filter="sexo">',
      buildSelectOptions(options.sexos, filters.sexo),
      "</select>",
      "</div>",

      '<div class="stats-field">',
      '<label for="statsFilterTexto">Búsqueda</label>',
      '<input id="statsFilterTexto" data-stats-filter="texto" type="text" value="', escapeHtml(filters.texto || ""), '" placeholder="Docente, carrera, capacitación, modalidad..." />',
      "</div>",
      "</div>"
    ].join("");

    bindEvents(host);
  }

  function getSelectedMultipleValues(select) {
    if (!select || !select.options) return [];

    return Array.prototype.slice.call(select.options)
      .filter(function eachOption(option) {
        return option.selected;
      })
      .map(function eachOption(option) {
        return option.value;
      })
      .filter(function eachValue(value) {
        return asText(value) && asText(value) !== "todos";
      });
  }

  function updateFilter(key, value) {
    var Store = window.STATS.Store;
    var App = window.STATS.App;

    if (!Store || !App) return;

    Store.setFilter(key, value, true);
    if (typeof App.refreshDerived === "function") {
      App.refreshDerived();
    }
  }

  function bindEvents(host) {
    if (!host || host.__statsFiltersBound) return;
    host.__statsFiltersBound = true;

    host.addEventListener("change", function onFilterChange(event) {
      var target = event.target;
      var key;
      var value;

      if (!target || !target.getAttribute) return;

      key = target.getAttribute("data-stats-filter");
      if (!key) return;

      if (key === "periodo") {
        /* Corrección:
           - Al cambiar cualquiera de los dos selectores de período,
           - se recalcula el array completo desde el host para mantener la firma actual. */
        value = getSelectedPeriodValues(host);
      } else {
        value = target.value;
      }

      updateFilter(key, value);
    });

    host.addEventListener("input", function onFilterInput(event) {
      var target = event.target;
      var key;

      if (!target || !target.getAttribute) return;

      key = target.getAttribute("data-stats-filter");
      if (key !== "texto") return;

      updateFilter(key, target.value || "");
    });
  }

  window.STATS.Filters = {
    render: render,
    getOptionsFromState: getOptionsFromState
  };
})(window, document);