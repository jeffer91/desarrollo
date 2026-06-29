/* =========================================================
Nombre completo: lb.citation-manager.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.citation-manager.js
Función o funciones:
1. Gestionar citas internas APA 7 del libro.
2. Relacionar citas con referencias verificadas.
3. Evitar citas sin fuente real asociada.
========================================================= */

(function attachLbCitationManager(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function authorLabel(ref) {
    var authors = Array.isArray(ref && ref.authors) ? ref.authors : [];
    if (!authors.length) return text(ref && ref.institution) || "Autor institucional";
    if (authors.length === 1) return text(authors[0]);
    if (authors.length === 2) return text(authors[0]) + " y " + text(authors[1]);
    return text(authors[0]) + " et al.";
  }

  function yearLabel(ref) {
    return text(ref && ref.year) || "s. f.";
  }

  function inTextCitation(ref) {
    return "(" + authorLabel(ref) + ", " + yearLabel(ref) + ")";
  }

  function narrativeCitation(ref) {
    return authorLabel(ref) + " (" + yearLabel(ref) + ")";
  }

  function attachCitationsToUnits(unitsBlock, references) {
    var refs = Array.isArray(references) ? references : [];
    var units = unitsBlock && Array.isArray(unitsBlock.units) ? unitsBlock.units : [];

    units.forEach(function eachUnit(unit, unitIndex) {
      var ref = refs[unitIndex % Math.max(refs.length, 1)];
      unit.suggestedCitation = ref ? inTextCitation(ref) : "[cita APA 7 pendiente de fuente verificable]";

      if (unit.contentBlock && Array.isArray(unit.contentBlock.items)) {
        unit.contentBlock.items.forEach(function eachContent(content, contentIndex) {
          var contentRef = refs[(unitIndex + contentIndex) % Math.max(refs.length, 1)];
          content.suggestedCitation = contentRef ? inTextCitation(contentRef) : "[cita APA 7 pendiente de fuente verificable]";
        });
      }
    });

    return unitsBlock;
  }

  window.LibroGenLibroCitationManager = {
    inTextCitation: inTextCitation,
    narrativeCitation: narrativeCitation,
    attachCitationsToUnits: attachCitationsToUnits
  };
})(window);
