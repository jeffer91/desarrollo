/* =========================================================
Nombre completo: titulacion-validaciones.js
Ruta: /Titulacion/frontend/js/core/titulacion-validaciones.js
Función o funciones:
- Validar la estructura del documento de titulación.
- Normalizar documentos, secciones, metadatos y anexos.
- Evitar que datos incompletos rompan la vista previa o exportación PDF.
========================================================= */

(function (window) {
  "use strict";

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function asText(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.asText === "function"
    ) {
      return window.TITULACION_UTILS.asText(value);
    }

    return String(value === null || value === undefined ? "" : value).trim();
  }

  function normalizeKey(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.normalizeKey === "function"
    ) {
      return window.TITULACION_UTILS.normalizeKey(value);
    }

    return asText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeContent(contenido) {
    if (!Array.isArray(contenido)) {
      if (asText(contenido)) {
        return [asText(contenido)];
      }

      return [];
    }

    return contenido
      .map(function (item) {
        return asText(item);
      })
      .filter(Boolean);
  }

  function normalizeSection(section, index) {
    var safe = isObject(section) ? section : {};
    var title = asText(safe.titulo) || "Sección " + String(index + 1);
    var id = asText(safe.id) || normalizeKey(title) || "seccion_" + String(index + 1);

    return {
      id: id,
      titulo: title,
      contenido: normalizeContent(safe.contenido),
      orden: Number.isFinite(Number(safe.orden)) ? Number(safe.orden) : index + 1,
      tipo: asText(safe.tipo || safe.type || "capitulo"),
      visible: safe.visible === false ? false : true,
      data: isObject(safe.data) ? safe.data : {}
    };
  }

  function normalizeMeta(meta) {
    var safe = isObject(meta) ? meta : {};

    return {
      periodo: asText(safe.periodo),
      periodoId: asText(safe.periodoId),
      fechaElaboracion: asText(safe.fechaElaboracion),
      modalidad: asText(safe.modalidad),
      tipoDocumento: asText(safe.tipoDocumento),
      codigoDocumento: asText(safe.codigoDocumento),
      carrera: asText(safe.carrera),
      sede: asText(safe.sede)
    };
  }

  function normalizeAnexo(anexo, index) {
    var safe = isObject(anexo) ? anexo : {};

    return {
      id: asText(safe.id) || "anexo-" + String(index + 1),
      source: asText(safe.source || safe.tipo || "otros"),
      name: asText(safe.name || safe.nombre || "Anexo " + String(index + 1)),
      type: asText(safe.type || safe.mime || "application/octet-stream"),
      size: Number(safe.size || 0),
      dataUrl: asText(safe.dataUrl),
      bucket: asText(safe.bucket),
      path: asText(safe.path),
      publicUrl: asText(safe.publicUrl),
      readableUrl: asText(safe.readableUrl),
      uploadedAt: asText(safe.uploadedAt),
      online: !!safe.online
    };
  }

  function normalizeDocument(documentData) {
    var safe = isObject(documentData) ? documentData : {};
    var sections = Array.isArray(safe.secciones) ? safe.secciones : [];
    var anexos = Array.isArray(safe.anexos) ? safe.anexos : [];

    return {
      titulo: asText(safe.titulo) || "Informe Final Del Proceso De Titulación",
      subtitulo: asText(safe.subtitulo),
      meta: normalizeMeta(safe.meta),
      secciones: sections.map(normalizeSection).filter(function (section) {
        return section.visible !== false;
      }),
      anexos: anexos.map(normalizeAnexo),
      createdAt: asText(safe.createdAt),
      updatedAt: new Date().toISOString()
    };
  }

  function validateDocument(documentData) {
    var errors = [];
    var warnings = [];
    var doc = normalizeDocument(documentData);

    if (!doc.titulo) {
      errors.push("El documento no tiene título.");
    }

    if (!Array.isArray(doc.secciones)) {
      errors.push("El documento no tiene una lista válida de secciones.");
    }

    if (Array.isArray(doc.secciones) && doc.secciones.length === 0) {
      warnings.push("El documento no tiene secciones cargadas.");
    }

    doc.secciones.forEach(function (section, index) {
      if (!section.id) {
        errors.push("La sección " + String(index + 1) + " no tiene identificador.");
      }

      if (!section.titulo) {
        errors.push("La sección " + String(index + 1) + " no tiene título.");
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      documentData: doc
    };
  }

  function assertDocument(documentData) {
    var validation = validateDocument(documentData);

    if (!validation.valid) {
      throw new Error(validation.errors.join(" | "));
    }

    return validation.documentData;
  }

  window.TITULACION_VALIDACIONES = {
    normalizeSection: normalizeSection,
    normalizeAnexo: normalizeAnexo,
    normalizeDocument: normalizeDocument,
    validateDocument: validateDocument,
    assertDocument: assertDocument
  };
})(window);