/* =========================================================
Nombre completo: lb.references-validator.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.references-validator.js
Función o funciones:
1. Validar que las referencias usadas por Gen libro tengan datos mínimos reales.
2. Evitar referencias inventadas o incompletas.
3. Priorizar referencias recientes y verificables para APA 7.
========================================================= */

(function attachLbReferencesValidator(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  function hasAuthor(ref) {
    return Boolean(
      (Array.isArray(ref && ref.authors) && ref.authors.length) ||
      text(ref && ref.institution)
    );
  }

  function hasLocator(ref) {
    return Boolean(text(ref && ref.url) || text(ref && ref.doi) || text(ref && ref.isbn));
  }

  function isRecent(ref) {
    var year = Number(ref && ref.year);
    return Boolean(year && year >= currentYear() - 5 && year <= currentYear() + 1);
  }

  function validateOne(ref) {
    var errors = [];
    var warnings = [];

    if (!hasAuthor(ref)) errors.push("Falta autor o institución.");
    if (!text(ref && ref.title)) errors.push("Falta título.");
    if (!text(ref && ref.year)) errors.push("Falta año.");
    if (!hasLocator(ref)) warnings.push("Falta DOI, URL o ISBN verificable.");
    if (!isRecent(ref)) warnings.push("La referencia no está dentro de los últimos cinco años.");

    return {
      ok: errors.length === 0,
      usable: errors.length === 0 && hasLocator(ref),
      errors: errors,
      warnings: warnings,
      reference: ref
    };
  }

  function validateAll(references) {
    var items = Array.isArray(references) ? references : [];
    var validations = items.map(validateOne);
    var usable = validations.filter(function filterUsable(item) { return item.usable; }).map(function mapRef(item) { return item.reference; });

    return {
      ok: usable.length >= 15,
      total: items.length,
      usable: usable.length,
      minimumRequired: 15,
      validations: validations,
      references: usable,
      message: usable.length >= 15 ? "Referencias verificables suficientes." : "Faltan referencias verificables para completar APA 7."
    };
  }

  window.LibroGenLibroReferencesValidator = {
    validateOne: validateOne,
    validateAll: validateAll,
    isRecent: isRecent
  };
})(window);
