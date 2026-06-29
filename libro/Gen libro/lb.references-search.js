/* =========================================================
Nombre completo: lb.references-search.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.references-search.js
Función o funciones:
1. Buscar referencias reales en línea mediante API segura de Electron.
2. Crear consultas a partir de carrera, materia, unidades y contenidos.
3. No inventar referencias si la búsqueda no devuelve resultados verificables.
========================================================= */

(function attachLbReferencesSearch(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasElectronSearch() {
    return Boolean(
      window.api &&
      window.api.references &&
      typeof window.api.references.search === "function"
    );
  }

  function buildQueries(plan) {
    var queries = [];
    var base = [text(plan && plan.materia), text(plan && plan.carrera)].filter(Boolean).join(" ");

    if (base) {
      queries.push(base + " artículo científico últimos 5 años");
      queries.push(base + " libro académico");
      queries.push(base + " fuente institucional técnica");
    }

    asArray(plan && plan.units).forEach(function eachUnit(unit) {
      var title = text(unit.originalTitle || unit.title);
      if (title) queries.push(title + " " + text(plan && plan.materia) + " artículo científico");

      asArray(unit.contents).slice(0, 3).forEach(function eachContent(content) {
        if (text(content.titulo)) queries.push(text(content.titulo) + " " + text(plan && plan.materia) + " APA 7");
      });
    });

    return queries.slice(0, 18);
  }

  function normalizeResult(item, query) {
    var authors = item && Array.isArray(item.authors) ? item.authors : [];

    return {
      id: text(item && item.id) || "ref-" + Math.random().toString(36).slice(2, 10),
      authors: authors,
      institution: text(item && (item.institution || item.publisher || item.sourceInstitution)),
      year: text(item && item.year),
      title: text(item && item.title),
      source: text(item && (item.source || item.journal || item.publisher)),
      doi: text(item && item.doi),
      url: text(item && item.url),
      isbn: text(item && item.isbn),
      type: text(item && item.type) || "fuente_verificada",
      query: query,
      verified: Boolean(item && (item.url || item.doi || item.isbn)),
      raw: item || null
    };
  }

  async function searchOnline(query) {
    if (!hasElectronSearch()) {
      return [];
    }

    var result = await window.api.references.search({
      query: query,
      language: "es",
      recencyYears: 5,
      maxResults: 6
    });

    var items = result && Array.isArray(result.items) ? result.items : [];
    return items.map(function mapItem(item) {
      return normalizeResult(item, query);
    });
  }

  async function search(plan) {
    var queries = buildQueries(plan);
    var references = [];
    var errors = [];

    if (!hasElectronSearch()) {
      return {
        ok: false,
        mode: "missing_electron_reference_search",
        queries: queries,
        references: [],
        errors: ["No se detectó window.api.references.search para buscar referencias reales."],
        searchedAt: new Date().toISOString()
      };
    }

    for (var i = 0; i < queries.length; i += 1) {
      try {
        references = references.concat(await searchOnline(queries[i]));
      } catch (error) {
        errors.push(error && error.message ? error.message : String(error));
      }
    }

    return {
      ok: references.length > 0,
      mode: "online",
      queries: queries,
      references: references,
      errors: errors,
      searchedAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroReferencesSearch = {
    buildQueries: buildQueries,
    search: search,
    hasElectronSearch: hasElectronSearch
  };
})(window);
