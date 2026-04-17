/*
=========================================================
Nombre completo: mesa-pdf-engine.js
Ruta o ubicación: /js/mesa-pdf-engine.js
Función o funciones:
- Preparar una ventana imprimible del docente.
- Facilitar impresión y exportación PDF desde el navegador.
- Reutilizar la plantilla HTML del template engine.
=========================================================
*/
"use strict";

(function attachMesaPdfEngine(global) {
  function sanitizeFileNamePart(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

  function buildTitle(docente) {
    const fullName = global.MesaDocenteSchema.buildFullName(docente) || "docente";
    return `ficha_docente_${sanitizeFileNamePart(fullName)}`;
  }

  function openPrintableWindow(html, title) {
    const popup = window.open("", "_blank");

    if (!popup) {
      throw new Error("El navegador bloqueó la ventana emergente.");
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.document.title = title || "Ficha docente";

    return popup;
  }

  function printDocente(docente) {
    if (!docente) {
      throw new Error("No hay docente para imprimir.");
    }

    const title = buildTitle(docente);
    const html = global.MesaTemplateEngine.buildPrintableDocument(docente);
    const popup = openPrintableWindow(html, title);

    popup.onload = () => {
      setTimeout(() => {
        popup.focus();
        popup.print();
      }, 250);
    };

    return popup;
  }

  function exportPdf(docente) {
    return printDocente(docente);
  }

  global.MesaPdfEngine = {
    sanitizeFileNamePart,
    buildTitle,
    openPrintableWindow,
    printDocente,
    exportPdf
  };
})(window);