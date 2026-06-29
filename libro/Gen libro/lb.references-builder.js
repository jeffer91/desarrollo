/* =========================================================
Nombre completo: lb.references-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.references-builder.js
Función o funciones:
1. Construir referencias bibliográficas APA 7 verificables.
2. Validar mínimo 15 referencias reales antes de cerrar el libro.
3. Integrar citas internas con las unidades desarrolladas.
========================================================= */

(function attachLbReferencesBuilder(window) {
  "use strict";

  var Search = window.LibroGenLibroReferencesSearch || null;
  var Validator = window.LibroGenLibroReferencesValidator || null;
  var CitationManager = window.LibroGenLibroCitationManager || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function refresh() {
    Search = window.LibroGenLibroReferencesSearch || Search;
    Validator = window.LibroGenLibroReferencesValidator || Validator;
    CitationManager = window.LibroGenLibroCitationManager || CitationManager;
  }

  function authorApa(ref) {
    var authors = asArray(ref && ref.authors).map(text).filter(Boolean);
    if (authors.length) return authors.join(", ");
    return text(ref && ref.institution) || "Autor institucional";
  }

  function formatApa(ref) {
    var author = authorApa(ref);
    var year = text(ref && ref.year) || "s. f.";
    var title = text(ref && ref.title) || "Título pendiente";
    var source = text(ref && ref.source);
    var locator = text(ref && ref.doi) || text(ref && ref.url) || text(ref && ref.isbn);

    return [
      author + " (" + year + "). " + title + ".",
      source ? source + "." : "",
      locator || ""
    ].filter(Boolean).join(" ");
  }

  function dedupe(references) {
    var seen = {};
    var result = [];

    asArray(references).forEach(function eachRef(ref) {
      var key = [text(ref.title).toLowerCase(), text(ref.year), text(ref.doi), text(ref.url)].join("|");
      if (!seen[key]) {
        seen[key] = true;
        result.push(ref);
      }
    });

    return result;
  }

  async function build(plan, bookDraft) {
    refresh();

    var searchResult = Search && typeof Search.search === "function"
      ? await Search.search(plan)
      : { ok: false, references: [], errors: ["No existe buscador de referencias."] };

    var rawReferences = dedupe(searchResult.references || []);
    var validation = Validator && typeof Validator.validateAll === "function"
      ? Validator.validateAll(rawReferences)
      : { ok: false, references: [], message: "No existe validador de referencias." };

    var finalReferences = asArray(validation.references).map(function mapRef(ref, index) {
      return Object.assign({}, ref, {
        order: index + 1,
        apa7: formatApa(ref)
      });
    });

    if (bookDraft && bookDraft.units && CitationManager && typeof CitationManager.attachCitationsToUnits === "function") {
      CitationManager.attachCitationsToUnits(bookDraft.units, finalReferences);
    }

    return {
      id: "references",
      title: "Referencias Bibliográficas",
      ok: validation.ok,
      minimumRequired: 15,
      totalFound: rawReferences.length,
      totalUsable: finalReferences.length,
      references: finalReferences,
      apa7Text: finalReferences.map(function mapApa(ref) { return ref.apa7; }).join("\n"),
      validation: validation,
      search: searchResult,
      message: validation.message,
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroReferencesBuilder = {
    build: build,
    formatApa: formatApa,
    dedupe: dedupe
  };
})(window);
